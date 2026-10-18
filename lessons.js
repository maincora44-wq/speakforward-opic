(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SFLessons = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const lessons = [
    { id: 'questions', title: '질문의 순서', subtitle: 'Do · Does · Did · 의문사', icon: '01', skill: '질문 어순',
      rows: [
        ['variance', '비용이 늘어난 이유를 물어보세요.', 'Why did operating expenses increase in March?', 'Why + did + 주어 + 동사원형 순서입니다.',
          ['Why operating expenses did increase in March?', ['question_word_order'], '의문사 다음에 did, 그 다음에 주어가 와요.'],
          ['Why did operating expenses increased in March?', ['base_verb'], 'did가 과거를 나타내므로 increase는 동사원형을 써요.']],
        ['balance', '이 잔액에 연말 조정이 포함되는지 물어보세요.', 'Does this balance include the year-end adjustment?', 'Does + 주어 + 동사원형을 사용해요.',
          ['Does this balance includes the year-end adjustment?', ['base_verb'], 'Does 뒤에는 includes가 아니라 include를 써요.']],
        ['owner', '관계사 대사를 검토하는 사람이 누구인지 물어보세요.', 'Who reviews the intercompany reconciliation?', '누가 행동하는지 묻는 주어 의문문에는 do를 넣지 않아요.',
          ['Who does reviews the intercompany reconciliation?', ['subject_question'], 'Who가 주어이므로 reviews를 바로 연결해요.']],
        ['documents', '증빙 자료가 언제 준비되는지 물어보세요.', 'When will the supporting documents be available?', 'When + will + 주어 + be 순서로 말해요.'],
        ['approval', '월 결산을 누가 승인하는지 물어보세요.', 'Who approves the monthly close?', 'Who가 주어이면 일반 문장처럼 approves를 연결해요.'],
        ['submit', '보고서를 어제 제출했는지 물어보세요.', 'Did you submit the report yesterday?', 'Did + 주어 + submit. 과거형은 did가 맡아요.',
          ['Did you submitted the report yesterday?', ['base_verb'], 'Did 다음에는 submitted가 아니라 submit이에요.']]
      ] },
    { id: 'requests', title: '정중하게 요청하기', subtitle: 'Could you · Would you · Please', icon: '02', skill: '정중한 요청',
      rows: [
        ['schedule', '수정된 감사 일정을 정중하게 요청하세요.', 'Could you share the revised audit schedule?', 'Could you + 동사원형으로 부드럽게 요청해요.',
          ['Share the revised audit schedule.', ['politeness'], '이 연습의 목표는 정중한 요청이에요. Could you share ...?를 사용해 보세요.']],
        ['evidence', '워크스루 전에 통제 증빙을 정중하게 요청하세요.', 'Would you please send the control evidence before the walkthrough?', 'Would you please + 동사로 요청을 완곡하게 만들어요.'],
        ['clarify', '회계 정책을 명확히 설명해 달라고 요청하세요.', 'Could you clarify the accounting policy?', 'clarify는 불명확한 내용을 명확하게 설명해 달라는 뜻이에요.'],
        ['confirm', '제출 마감일을 확인해 달라고 요청하세요.', 'Could you confirm the submission deadline?', 'confirm은 정보를 재확인할 때 사용해요.'],
        ['breakdown', '비용 명세를 제공해 달라고 요청하세요.', 'Could you provide a breakdown of the expenses?', 'a breakdown of는 항목별 세부 내역을 뜻해요.'],
        ['repeat', '마지막 내용을 다시 말해 달라고 요청하세요.', 'Would you please repeat the last point?', '못 들었을 때 repeat the last point라고 정중하게 요청해요.']
      ] },
    { id: 'audit', title: '글로벌 감사 미팅', subtitle: 'Evidence · Controls · Reconciliation', icon: '03', skill: '감사 미팅',
      rows: [
        ['scope', '감사 범위에 무엇이 포함되는지 물어보세요.', 'What does the audit scope include?', 'What + does + 주어 + 동사원형의 순서예요.'],
        ['tested', '통제를 언제 테스트했는지 물어보세요.', 'When was the control tested?', '수동태 질문은 When + was + 주어 + 과거분사예요.'],
        ['difference', '차이가 발생한 이유를 물어보세요.', 'Why is there a difference in the reconciliation?', 'Why is there ...?로 차이가 있는 이유를 확인해요.'],
        ['sample', '표본을 선정한 방법을 물어보세요.', 'How did you select the sample?', 'How + did + 주어 + select로 방법을 물어요.'],
        ['access', '증빙 폴더에 접근 권한이 있는지 물어보세요.', 'Do we have access to the evidence folder?', 'Do we have access to ...?로 접근 가능 여부를 확인해요.'],
        ['followup', '후속 회의를 잡아 달라고 정중하게 요청하세요.', 'Could you arrange a follow-up meeting?', 'arrange a meeting은 회의를 준비하거나 잡는 표현이에요.']
      ] },
    { id: 'meetings', title: '해외 법인과 협업', subtitle: 'Deadlines · Time zones · Action items', icon: '04', skill: '업무 협업',
      rows: [
        ['timezone', '회의가 어느 시간대 기준인지 물어보세요.', 'Which time zone is the meeting scheduled in?', 'Which time zone으로 회의 기준 시간대를 확인해요.'],
        ['update', '진행 상황을 간단히 공유해 달라고 요청하세요.', 'Could you give us a brief update?', 'a brief update는 짧은 진행 상황 공유예요.'],
        ['deadline', '금요일까지 자료를 받을 수 있는지 물어보세요.', 'Can we receive the documents by Friday?', 'by Friday는 금요일까지라는 마감 시점을 뜻해요.'],
        ['responsibility', '현지 팀이 준비해야 하는 항목을 물어보세요.', 'What should the local team prepare?', 'What + should + 주어 + 동사원형 순서로 질문해요.'],
        ['agreement', '다음 단계에 합의할 수 있는지 물어보세요.', 'Can we agree on the next steps?', 'agree on은 함께 결정하거나 합의한다는 뜻이에요.'],
        ['summary', '실행 항목을 요약해 달라고 요청하세요.', 'Could you summarize the action items?', 'action items는 회의 이후 실행할 업무 항목이에요.']
      ] }
  ];
  const bank = {};
  for (const lesson of lessons) {
    lesson.ids = lesson.rows.map((row, index) => {
      const [key, prompt, answer, explanation, ...patterns] = row;
      const id = lesson.id + '-' + key + '-v1';
      bank[id] = { id, version: 1, lessonId: lesson.id, prompt, answers: [answer], explanation,
        kind: index % 2 === 0 ? 'order' : 'type', skill: lesson.skill,
        errors: patterns.map(([answer, tags, message]) => ({ answer, tags, message })), provenance: 'Original SpeakForward content' };
      return id;
    });
    delete lesson.rows;
  }
  return { lessons, bank };
});
