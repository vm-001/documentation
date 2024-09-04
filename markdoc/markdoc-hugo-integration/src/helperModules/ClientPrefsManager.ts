/**
 * A class containing functions for resolving the user's
 * current preferences, and updating the page content in response
 * to selection changes.
 *
 * When a new page loads, it should call ClientPrefsManager.initialize()
 * in order to set up the ClientPrefsManager with the necessary data
 * for re-rendering the content and the filter UI
 * in response to user selection changes.
 *
 * There should only be one instance of the ClientPrefsManager
 * in the application, with the configuration
 * updating as various pages are loaded.
 *
 * The minified ClientPrefsManager is provided in the assets partial string
 * generated by MarkdocHugoIntegration.buildAssetsPartial().
 * The contents of that partial should be included
 * in the head of the main page layout.
 */

import { buildFilterSelectorUi } from './PageBuilder/components/ContentFilter';
import { MinifiedPrefOptionsConfig } from '../schemas/yaml/prefOptions';
import { MinifiedPagePrefsConfig } from '../schemas/yaml/frontMatter';
import { ClientFunction } from 'markdoc-static-compiler/src/types';
import { resolveMinifiedPagePrefs } from './prefsResolution';
import { reresolveFunctionNode } from 'markdoc-static-compiler/src/reresolver';
import {
  expandClientFunction,
  MinifiedClientFunction
} from './PageBuilder/pageConfigMinification';

export class ClientPrefsManager {
  static #instance: ClientPrefsManager;

  private prefOptionsConfig?: MinifiedPrefOptionsConfig;
  private pagePrefsConfig?: MinifiedPagePrefsConfig;
  private filterSelectorEl?: HTMLElement;
  private selectedValsByPrefId: Record<string, string> = {};
  private ifFunctionsByRef: Record<string, ClientFunction> = {};
  private storedPreferences: Record<string, string> = {};

  private constructor() {}

  /**
   * Return the existing instance,
   * or create a new one if none exists.
   */
  public static get instance(): ClientPrefsManager {
    if (!ClientPrefsManager.#instance) {
      ClientPrefsManager.#instance = new ClientPrefsManager();
      ClientPrefsManager.#instance.retrieveStoredPreferences();
      // @ts-ignore
      window.markdocBeforeRevealHooks = window.markdocBeforeRevealHooks || [];
      // @ts-ignore
      window.markdocAfterRerenderHooks = window.markdocAfterRerenderHooks || [];
    }

    return ClientPrefsManager.#instance;
  }

  retrieveStoredPreferences() {
    const storedPreferences = JSON.parse(localStorage.getItem('content-prefs') || '{}');
    this.storedPreferences = storedPreferences;
  }

  updateStoredPreferences() {
    const storedPreferences = JSON.parse(localStorage.getItem('content-prefs') || '{}');
    const newStoredPreferences = {
      ...storedPreferences,
      ...this.selectedValsByPrefId
    };
    this.storedPreferences = newStoredPreferences;
    localStorage.setItem('content-prefs', JSON.stringify(newStoredPreferences));
  }

  getSelectedValsFromUrl() {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    const selectedValsByPrefId: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      if (key in Object.keys(this.selectedValsByPrefId)) {
        selectedValsByPrefId[key] = val;
      }
    });

    return selectedValsByPrefId;
  }

  syncUrlWithSelectedVals() {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    const sortedPrefIds = Object.keys(this.selectedValsByPrefId).sort();

    // Apply selected values
    sortedPrefIds.forEach((prefId) => {
      searchParams.set(prefId, this.selectedValsByPrefId[prefId]);
    });

    window.history.replaceState({}, '', url.toString());
  }

  /**
   * When the user changes a preference value,
   * update the selected values data,
   * and rerender the chooser and page content.
   */
  handlePrefSelectionChange(e: Event) {
    const node = e.target;
    if (!(node instanceof Element)) {
      return;
    }
    const prefId = node.getAttribute('data-pref-id');
    if (!prefId) {
      return;
    }
    const optionId = node.getAttribute('data-option-id');
    if (!optionId) {
      return;
    }

    this.selectedValsByPrefId[prefId] = optionId;
    this.rerender();
    this.syncUrlWithSelectedVals();
    this.updateStoredPreferences();
  }

  /**
   * Check whether the element or any of its ancestors
   * have the class 'mdoc__hidden'.
   */
  elementIsHidden(element: Element) {
    // check whether the element or any of its parents are hidden
    let currentElement: Element | null = element;
    while (currentElement) {
      if (currentElement.classList.contains('mdoc__hidden')) {
        return true;
      }
      currentElement = currentElement.parentElement;
    }
  }

  /**
   * Should run after the page has been rendered.
   */
  populateRightNav() {
    let html = '<ul>';
    const headers = Array.from(
      document.querySelectorAll('#mainContent h2, #mainContent h3')
    );
    let lastSeenLevel = 2;
    headers.forEach((header) => {
      if (this.elementIsHidden(header)) {
        return;
      }

      // Start or end a list if the level has changed
      const level = parseInt(header.tagName[1]);
      if (level === lastSeenLevel) {
        html += '</li>';
      } else if (level > lastSeenLevel) {
        html += '<ul>';
      } else if (level < lastSeenLevel) {
        html += '</ul></li>';
      }
      lastSeenLevel = level;

      html += `<li><a href="#${header.id}">${header.textContent}</a>`;
    });
    html += '</li></ul>';
    const rightNav = document.getElementById('TableOfContents');
    if (!rightNav) {
      return;
    }
    rightNav.innerHTML = html;
  }

  rerender() {
    this.rerenderFilterSelector();
    this.rerenderPageContent();
    this.populateRightNav();
    //@ts-ignore
    markdocAfterRerenderHooks.forEach((hook) => hook());
  }

  /**
   * Rerender the section of the page that was derived
   * from the author's .mdoc file.
   */
  rerenderPageContent() {
    const newDisplayStatusByRef: Record<string, boolean> = {};

    // Update the resolved function values,
    // and make a list of refs that require a display status change
    Object.keys(this.ifFunctionsByRef).forEach((ref) => {
      const clientFunction = this.ifFunctionsByRef[ref];
      const oldValue = clientFunction.value;
      const resolvedFunction = reresolveFunctionNode(clientFunction, {
        variables: this.selectedValsByPrefId
      });
      this.ifFunctionsByRef[ref] = resolvedFunction;
      if (oldValue !== resolvedFunction.value) {
        newDisplayStatusByRef[ref] = resolvedFunction.value;
      }
    });

    const toggleables = document.getElementsByClassName('mdoc__toggleable');
    for (let i = 0; i < toggleables.length; i++) {
      const toggleable = toggleables[i];

      const ref = toggleable.getAttribute('data-if');

      if (!ref) {
        throw new Error('No ref found on toggleable element');
      }
      if (newDisplayStatusByRef[ref] === undefined) {
        continue;
      }

      if (newDisplayStatusByRef[ref]) {
        toggleable.classList.remove('mdoc__hidden');
      } else {
        toggleable.classList.add('mdoc__hidden');
      }
    }
  }

  /**
   * Listen for changes in the filter selector.
   */
  addFilterSelectorEventListeners() {
    const prefPills = document.getElementsByClassName('mdoc-pref__pill');
    for (let i = 0; i < prefPills.length; i++) {
      prefPills[i].addEventListener('click', (e) => this.handlePrefSelectionChange(e));
    }
  }

  locateFilterSelectorEl() {
    const filterSelectorEl = document.getElementById('mdoc-selector');
    if (!filterSelectorEl) {
      return false;
    } else {
      this.filterSelectorEl = filterSelectorEl;
      return true;
    }
  }

  applyPrefOverrides() {
    const relevantPrefIds = Object.keys(this.selectedValsByPrefId);
    let prefOverrideFound = false;

    // Override default values with stored preferences
    Object.keys(this.storedPreferences).forEach((prefId) => {
      if (
        relevantPrefIds.includes(prefId) &&
        this.selectedValsByPrefId[prefId] !== this.storedPreferences[prefId]
      ) {
        this.selectedValsByPrefId[prefId] = this.storedPreferences[prefId];
        prefOverrideFound = true;
      }
    });

    // Override stored preferences with URL params
    const urlPrefs = this.getSelectedValsFromUrl();
    Object.keys(urlPrefs).forEach((prefId) => {
      if (
        relevantPrefIds.includes(prefId) &&
        this.selectedValsByPrefId[prefId] !== urlPrefs[prefId]
      ) {
        this.selectedValsByPrefId[prefId] = urlPrefs[prefId];
        prefOverrideFound = true;
      }
    });

    return prefOverrideFound;
  }

  updateEditButton() {
    const editButton = document.getElementsByClassName('toc-edit-btn')[0];
    if (!editButton) {
      return;
    }
    const editButtonLink = editButton.getElementsByTagName('a')[0];
    if (!editButtonLink) {
      return;
    }
    editButtonLink.href = editButtonLink.href.replace(/\.md\/$/, '.mdoc/');
  }

  initialize(p: {
    prefOptionsConfig: MinifiedPrefOptionsConfig;
    pagePrefsConfig: MinifiedPagePrefsConfig;
    selectedValsByPrefId?: Record<string, string>;
    ifFunctionsByRef: Record<string, MinifiedClientFunction>;
  }) {
    this.prefOptionsConfig = p.prefOptionsConfig;
    this.pagePrefsConfig = p.pagePrefsConfig;
    this.selectedValsByPrefId = p.selectedValsByPrefId || {};
    this.ifFunctionsByRef = {};

    const contentIsCustomizable = this.locateFilterSelectorEl();
    if (contentIsCustomizable) {
      // Unminify conditional function data
      Object.keys(p.ifFunctionsByRef).forEach((ref) => {
        this.ifFunctionsByRef[ref] = expandClientFunction(
          p.ifFunctionsByRef[ref]
        ) as ClientFunction;
      });

      const overrideApplied = this.applyPrefOverrides();
      if (overrideApplied) {
        this.rerender();
      } else {
        this.addFilterSelectorEventListeners();
      }
    }

    this.populateRightNav();
    this.revealPage();
    this.updateEditButton();

    if (contentIsCustomizable) {
      this.syncUrlWithSelectedVals();
      this.updateStoredPreferences();
    }
  }

  revealPage() {
    // @ts-ignore
    markdocBeforeRevealHooks.forEach((hook) => hook());

    if (this.filterSelectorEl) {
      this.filterSelectorEl.style.position = 'sticky';
      this.filterSelectorEl.style.top = '95px';
      this.filterSelectorEl.style.backgroundColor = 'white';
      this.filterSelectorEl.style.paddingTop = '10px';
      this.filterSelectorEl.style.visibility = 'visible';
      this.filterSelectorEl.style.zIndex = '1000';
    }

    const content = document.getElementById('mdoc-content');
    if (content) {
      content.style.visibility = 'visible';
    }
  }

  rerenderFilterSelector() {
    if (!this.pagePrefsConfig || !this.prefOptionsConfig || !this.filterSelectorEl) {
      throw new Error(
        'Cannot rerender filter selector without pagePrefsConfig, prefOptionsConfig, and filterSelectorEl'
      );
    }

    /**
     * Re-resolve the page prefs, since a newly selected value
     * can have a cascading impact on the interpolated placeholder values,
     * and thus the valid options for each preference.
     */
    const resolvedPagePrefs = resolveMinifiedPagePrefs({
      pagePrefsConfig: this.pagePrefsConfig,
      prefOptionsConfig: this.prefOptionsConfig!,
      valsByPrefId: this.selectedValsByPrefId
    });

    /**
     * Update the selected values to align with the resolved prefs,
     * in case any previously selected values
     * have become invalid and been overridden by defaults.
     */
    Object.keys(resolvedPagePrefs).forEach((resolvedPrefId) => {
      const resolvedPref = resolvedPagePrefs[resolvedPrefId];
      this.selectedValsByPrefId[resolvedPref.id] = resolvedPref.currentValue;
    });

    const newFilterSelectorHtml = buildFilterSelectorUi(resolvedPagePrefs);
    this.filterSelectorEl.innerHTML = newFilterSelectorHtml;
    this.addFilterSelectorEventListeners();
  }
}
