---
aliases:
- /ja/synthetics/guide/browser-tests-switch-tabs/
- /ja/synthetics/guide/browser-test-self-maintenance/
description: ブラウザテストステップに高度なオプションを構成する
further_reading:
- link: https://www.datadoghq.com/blog/browser-tests/
  tag: ブログ
  text: Synthetic ブラウザテストによるユーザーエクスペリエンスの監視
- link: /synthetics/browser_tests/actions/
  tag: ドキュメント
  text: ブラウザテストステップについて
title: ブラウザテストステップの高度なオプション
---

## 概要

このページでは、Synthetic ブラウザテストの高度なオプションについて説明します。


## 要素を探す

### Datadog アルゴリズム

エンドツーエンドのテストでは、不安定であることがネックになります。なぜなら、フロントエンドのチームが変更を加えたときにテストが失敗し、実際のアプリケーションの問題ではなく、テスト内の識別子がアラートを発することがあるからです。

Datadog では、不安定なテストを防ぐために、ロケータのセットを活用したアルゴリズムを使って、ブラウザテストで要素をターゲットにしています。UI の小さな変更により、要素が変更されることがあります (例えば、別の場所に移動する)。ブラウザテストは、変更によって影響を受けなかった参照ポイントに基づいて、自動的に要素の位置を再確認します。

テストが正常に実行されると、ブラウザテストは壊れたロケータを更新された値で再計算 (または「自己修復」) し、単純な UI の更新でテストが壊れることがなく、テストがアプリケーションの UI に自動的に適応することを保証します。

ブラウザテストで予期せぬ変更を検証しないようにするために、テスト作成時に[アサーション][5]を使用します。アサーションによって、テストステップのジャーニーに関連する期待される動作と期待されない動作とを定義することができます。

### ユーザー指定のロケーター

デフォルトでは、ブラウザテストは Datadog のロケータシステムを使用します。テストが対話する特定の要素 (例えばチェックアウトボタン) を探すとき、特定の XPath や特定の CSS セレクタで要素を探すのではなく、テストは要素を探すために複数の異なるポイント (例えば XPath、テキスト、クラス、近くの要素など) を使用するのです。

これらの参照点はロケータのセットとなり、それぞれが要素を一意に定義します。Datadog のロケータシステムは、テストの自己メンテナンスを可能にするため、カスタムセレクターはエッジケースにのみ使用する必要があります。

カスタムセレクターは、レコーダーで興味のあるステップ (**クリック**、**ホバー**、**アサート**など) をページの任意の要素に実行することで作成されます。これは、実行する必要があるステップの種類を指定します。

To use a specific identifier (for example, to click on the `nth` element in a dropdown menu regardless of what the content of the element is):

1. 記録するか、手動で[ステップ][1]を追加します。
2. 記録されたステップをクリックし、**Advanced options** をクリックします。
3. HTML 要素の **User Specified Locator** に XPath 1.0 セレクタまたは CSS クラス/ID (例: `div`、`h1`、または `.hero-body`) を入力します。
4. Optionally, use handlebars (`{{`) syntax to insert dynamic content. A pre-populated dropdown list of variables is shown:

{{< img src="synthetics/browser_tests/advanced_options/advanced_user_locator_2.png" alt="User specified locator field highlighting handlebar syntax with variables" style="width:70%">}}

5. 要素を定義した後、**Test** をクリックすると、記録中の要素が右の画面でハイライト表示されます。

デフォルトで、**If user specified locator fails, fail test** のチェックボックスはオンになっています。つまり、定義したロケータが失敗した場合、テストは失敗と見なされます。

{{< img src="synthetics/browser_tests/advanced_options/css.mp4" alt="テストハイライト要素" video=true >}}

通常のアルゴリズムでブラウザテストを行う場合は、**If user specified locator fails, fail test** チェックボックスをオフにしてください。

{{< img src="synthetics/browser_tests/advanced_options/fail_test.png" alt="テスト失敗時のオプション" style="width:70%">}}


## タイムアウト

ブラウザテストが要素を特定できない場合、ステップを 60 秒間再試行します。

このタイムアウト時間は、最長 300 秒まで増やしたり減らしたりできます。ターゲットの要素を特定できるまで待機する時間を変更するには、この秒数を指定してください。

{{< img src="synthetics/browser_tests/advanced_options/time_before_fail.png" alt="エラーまでの時間" style="width:50%">}}

## オプションステップ

たとえばポップアップイベントなどで、いくつかのステップをオプションで追加することが必要になるかもしれません。その場合は、**Allow this step to fail** を選択してください。ステップが失敗したまま、タイムアウトオプションに指定した時間 (デフォルトでは 60 秒) を経過した場合に、テストが次のステップへと移動して実行されます。

{{< img src="synthetics/browser_tests/advanced_options/timeout.png" alt="タイムアウト" style="width:25%">}}

## スクリーンショットのキャプチャを防ぐ

テストの実行時に手順のスクリーンショットがキャプチャされないようにできます。テスト結果に機密データを含めたくない場合に有用です。障害発生時のトラブルシューティングに影響を及ぼす可能性があるため、慎重に使用してください。詳しくは、[Synthetic Monitoring Data Security][2] をご覧ください。

{{< img src="synthetics/browser_tests/advanced_options/screenshot_capture_option.png" alt="スクリーンショットのキャプチャオプション" style="width:50%">}}

**注:** この機能は、ブラウザテストのコンフィギュレーションの[高度なオプション][3]として、グローバルテストレベルでも利用可能です。

## サブテスト

[サブテスト][4]の高度なオプションでは、サブテストを再生する場所を選択したり、サブテストが失敗した場合のブラウザテストの動作を設定することができます。

{{< img src="synthetics/browser_tests/advanced_options/subtest_advanced.png" alt="ブラウザテストにおけるサブテストの高度なオプション" style="width:60%">}}

### サブテストウィンドウを設定する

* **Main（デフォルト）**: サブテストはメインのウィンドウで、他のステップに続いて実行されます。
* **New**: サブテストは新しいウィンドウで実行され、終了時にタブが閉じます。つまり、他のテストではそのウィンドウを使用できません。
* **Specific window**: サブテストは番号の付いたウィンドウで実行されます。そのため、他のテストでもそのウィンドウを使用できます。

サブテストをメインウィンドウで開くと、サブテストはメインのテストに続いて、先行するステップと同じ URL で実行されます。新しいウィンドウまたは特定のウィンドウで開くと、テストはサブテストの開始 URL で実行されます。

### 失敗時の動作を設定する

**Continue with test if this step fails** (このステップが失敗した場合はテストを続行する) と **Consider entire test as failed if this step fails** (このステップが失敗した場合はテスト全体を失敗とみなす) をクリックして、サブテストが失敗した場合はブラウザテストを継続し、サブテストが失敗した場合は完全に失敗するようにします。

### サブテストの変数をオーバーライドする

ブラウザテストのサブテストの変数値をオーバーライドするには、サブテストで変数名を付け、親テストで同じ変数名を使用すると、ブラウザテストはサブテストの値をオーバーライドします。

詳しくは、[ブラウザテストステップ][4]をご覧ください。

## その他の参考資料

{{< partial name="whats-next/whats-next.html" >}}

[1]: /ja/synthetics/browser_tests/actions/
[2]: /ja/data_security/synthetics/
[3]: /ja/synthetics/browser_tests/?tab=privacy#test-configuration
[4]: /ja/synthetics/browser_tests/actions/#subtests
[5]: /ja/synthetics/browser_tests/actions/#assertion