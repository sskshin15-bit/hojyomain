import type { SubsidyJudgmentData } from "./types"

/**
 * モック補助金判定データ（JSON駆動型判定エンジン用）
 * 本番ではAPIやDBから取得する想定
 */
export const mockSubsidyData: SubsidyJudgmentData = {
  subsidy_id: "it_subsidy_mock",
  subsidy_name: "デジタル化・AI導入補助金（モック）",
  glossary: {
    みなし大企業:
      "大企業が実質的に経営を支配している中小企業のことです。具体的には「大企業が株式の1/2以上を所有している」などが該当します。",
    インボイス枠:
      "インボイス制度に対応するための会計ソフトや、PC・タブレット・レジ等のハードウェア購入費用を支援する特別枠です。",
  },
  nodes: {
    q1: {
      type: "question",
      text: "現在の従業員数は何名ですか？",
      inputType: "number",
      hint:
        "💡 一人経営（社長のみ）の場合は「1」と入力してください。みなし大企業に該当する場合は対象外です。小規模事業者向けの有利な枠が使える可能性があります。",
      next: {
        condition: "value >= 1",
        trueNode: "q2",
        falseNode: "error_1",
      },
    },
    q2: {
      type: "question",
      text: "事業所の都道府県を入力してください。",
      inputType: "text",
      hint: "💡 申請時の事業所所在地です。次の質問で「〇〇の最低賃金」として表示されます。",
      next: {
        condition: "value !== ''",
        trueNode: "q3",
        falseNode: "error_1",
      },
    },
    q3: {
      type: "question",
      text: "従業員の賃上げ（給料アップ）を計画していますか？",
      inputType: "yes_no",
      hint:
        "💡 事業場内最低賃金を＋50円以上引き上げる必要があります。{{q2}}の最低賃金を確認してください。",
      next: {
        condition: "value === 'yes'",
        trueNode: "result_success",
        falseNode: "alt_route_1",
      },
    },
    alt_route_1: {
      type: "alternative",
      text: "賃上げ要件を満たさない場合、通常枠での申請はできませんが、以下の代替ルートが可能です。インボイス枠を利用するとPC・レジ等の購入支援が受けられます。",
      options: [
        { label: "インボイス枠（PC・レジ等）で申請する", nextNode: "result_success_invoice" },
        { label: "小規模事業者持続化補助金の判定へ移動", nextNode: "redirect_to_jizokuka" },
      ],
    },
    error_1: {
      type: "result",
      status: "failure",
      message: "従業員数が要件を満たしていません。この補助金の対象は従業員1名以上の事業者です。みなし大企業に該当する場合は対象外となります。",
      todoList: ["従業員数の要件を再確認する", "別の補助金の判定を試す"],
    },
    result_success: {
      type: "result",
      status: "success",
      message: "要件をクリアしています！通常枠での申請が可能です。",
      todoList: [
        "gBizIDプライムアカウントの取得",
        "SECURITY ACTION（一つ星）の宣言",
        "みらデジ経営チェックの実施",
      ],
    },
    result_success_invoice: {
      type: "result",
      status: "success",
      message: "インボイス枠での申請が可能です。会計ソフトやPC・レジ等の導入で申請できます。",
      todoList: [
        "インボイス枠の申請要件を確認",
        "導入予定の機器・ソフトのリスト作成",
        "gBizIDプライムアカウントの取得",
      ],
    },
    redirect_to_jizokuka: {
      type: "result",
      status: "success",
      message: "小規模事業者持続化補助金の判定へ進む場合は、スクリーニング画面で「小規模事業者持続化補助金」を選択し、再度判定を実行してください。",
      todoList: [
        "AI 5秒スクリーニングで「小規模事業者持続化補助金」を候補から選択",
        "該当する場合は受給可否を判定する",
      ],
    },
  },
}
