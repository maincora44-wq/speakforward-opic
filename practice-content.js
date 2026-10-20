(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.SFPracticeContent = value;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const scenarios = [
    { id: 'audit-talk-v1', title: '감사 미팅 준비', subtitle: '일정 조율 · 증빙 요청 · 마감일 확인', lessonId: 'requests', steps: [
      { id: 'audit-time-v1', goal: '미팅을 금요일로 변경해 달라고 요청하기', tutor: 'Our audit meeting is on Thursday. Does that work for your team?',
        ko: '감사 미팅을 금요일로 바꿀 수 있을까요?', examples: ['Could we reschedule the audit meeting to Friday?', 'Could we move the audit meeting to Friday?'],
        note: 'Could we + 동사원형으로 함께 조율할 일을 정중하게 요청해요.',
        errors: [['Could we rescheduled the audit meeting to Friday?', 'base_verb', 'Could 뒤에는 rescheduled 대신 동사원형 reschedule을 써요.']] },
      { id: 'audit-evidence-v1', goal: '워크스루 전에 통제 증빙 요청하기', tutor: 'Friday works. What would you like us to prepare before the walkthrough?',
        ko: '워크스루 전에 통제 증빙을 보내 주시겠어요?', examples: ['Could you send the control evidence before the walkthrough?', 'Would you please send the control evidence before the walkthrough?'],
        note: 'Could you send ...?로 필요한 증빙을 구체적으로 요청해요.',
        errors: [['Could you sent the control evidence before the walkthrough?', 'base_verb', 'Could you 다음에는 send를 사용해요.'], ['Send the control evidence before the walkthrough.', 'politeness', '정중한 요청을 연습하려면 Could you ...?를 붙여 보세요.']] },
      { id: 'audit-documents-v1', goal: '증빙 자료 준비 시점 물어보기', tutor: 'We are gathering the documents. What else would you like to confirm?',
        ko: '증빙 자료는 언제 준비되나요?', examples: ['When will the supporting documents be available?', 'When will the documents be ready?'],
        note: 'When + will + 주어 + 동사 순서로 앞으로의 일정을 물어요.',
        errors: [['When the supporting documents will be available?', 'question_word_order', 'When 뒤에 will을 먼저 놓고 주어를 이어 주세요.']] },
      { id: 'audit-deadline-v1', goal: '제출 마감일 확인 요청하기', tutor: 'The documents should be ready on Monday. Shall we confirm the final submission date?',
        ko: '제출 마감일을 확인해 주시겠어요?', examples: ['Could you confirm the submission deadline?', 'Would you please confirm the submission deadline?'],
        note: 'confirm the deadline은 마감일을 재확인할 때 쓸 수 있어요.', errors: [] }
    ] },
    { id: 'fx-talk-v1', title: '환율 자료 설명하기', subtitle: '기준일 · 단위 · 출처를 확인하는 대화', lessonId: 'finance-fx-202509-v1', steps: [
      { id: 'fx-date-v1', goal: '환율 자료의 관측일 물어보기', tutor: 'Here is an exchange-rate report. What would you check before using it?',
        ko: '이 환율의 관측일은 언제인가요?', examples: ['What is the observation date?', 'Which date does this rate refer to?'],
        note: '관측일은 자료가 가리키는 날짜예요. 조회한 날짜와 구분해요.', errors: [] },
      { id: 'fx-unit-v1', goal: '환율 표시 단위 확인하기', tutor: 'The observation date is printed in the report. How would you check the quote convention?',
        ko: '이 환율은 1달러당 원화로 표시되어 있나요?', examples: ['Is this rate quoted in won per US dollar?', 'Is this rate expressed in KRW per USD?'],
        note: 'won per US dollar는 1 USD에 해당하는 KRW라는 뜻이에요.', errors: [] },
      { id: 'fx-source-v1', goal: '자료 출처 확인을 정중하게 요청하기', tutor: 'Yes, it is in KRW per USD. What would you ask about the data source?',
        ko: '이 환율의 출처를 확인해 주시겠어요?', examples: ['Could you confirm the source of this exchange rate?', 'Could you tell me the source of this exchange rate?'],
        note: '자료를 설명할 때 기준일, 단위와 함께 출처를 확인해요.',
        errors: [['Could you confirmed the source of this exchange rate?', 'base_verb', 'Could 다음에는 confirmed 대신 confirm을 사용해요.']] },
      { id: 'fx-summary-v1', goal: '과거 자료라는 점을 설명하기', tutor: 'The report cites FRED. How would you explain that these are past observations?',
        ko: '이 수치들은 현재 시세가 아니라 과거 관측값입니다.', examples: ['These are historical observations, not current market rates.', 'These figures are historical observations.'],
        note: 'historical observations로 과거 자료임을 분명하게 설명할 수 있어요.', errors: [] }
    ] },
    { id: 'experience-talk-v1', title: '과거 업무 경험 말하기', subtitle: '경험 소개 · 구체적 사건 · 배운 점', lessonId: 'questions', steps: [
      { id: 'experience-teams-v1', goal: '해외 팀과 일한 경험 소개하기', tutor: 'Have you ever worked with overseas teams?',
        ko: '저는 이전에 해외 팀과 일해 본 적이 있어요.', examples: ['I have worked with overseas teams before.', 'Yes, I have worked with overseas teams.'],
        note: 'have worked로 과거부터 지금까지의 경험을 소개해요.',
        errors: [['I have work with overseas teams before.', 'tense', 'have 뒤에 과거분사 worked를 사용해요.']] },
      { id: 'experience-project-v1', goal: '작년에 맡았던 구체적인 업무 설명하기', tutor: 'Tell me about a specific project you worked on last year.',
        ko: '저는 작년에 월 결산 업무를 했어요.', examples: ['I worked on the monthly close last year.', 'Last year, I worked on the monthly close.'],
        note: 'last year처럼 끝난 시점에는 과거형 worked가 자연스러워요.',
        errors: [['I work on the monthly close last year.', 'tense', '작년의 구체적인 사건이므로 worked로 말해 보세요.']] },
      { id: 'experience-result-v1', goal: '문제를 해결한 결과 설명하기', tutor: 'What did your team accomplish before the deadline?',
        ko: '저희는 마감 전에 차이를 해결했어요.', examples: ['We resolved the difference before the deadline.', 'We fixed the difference before the deadline.'],
        note: 'resolved the difference로 대사 차이를 해결한 결과를 설명해요.', errors: [] },
      { id: 'experience-learned-v1', goal: '그 경험에서 배운 점 말하기', tutor: 'What did you learn from that experience?',
        ko: '저는 요구 사항을 일찍 확인하는 것이 중요하다는 것을 배웠어요.', examples: ['I learned to confirm the requirements early.', 'I learned that it is important to confirm the requirements early.'],
        note: 'I learned to ...로 다음 업무에 적용할 배운 점을 말해요.', errors: [] }
    ] }
  ];
  const phrases = {};
  for (const scenario of scenarios) for (const step of scenario.steps) {
    phrases[step.id] = { ...step, scenarioId: scenario.id, lessonId: scenario.lessonId, title: scenario.title };
  }
  return { scenarios, phrases };
});
