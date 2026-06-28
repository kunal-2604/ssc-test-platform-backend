const shuffleArray = (array) => {
  return [...array].sort(() => Math.random() - 0.5);
};

export const formatQuestionForStudent = (question) => {
  const baseQuestion = {
    id: question.id,
    questionText: question.questionText,
    questionType: question.questionType,
    marks: question.marks,
    orderNo: question.orderNo
  };

  if (question.questionType === "MCQ" || question.questionType === "ODD_ONE_OUT") {
    return {
      ...baseQuestion,
      options: shuffleArray(question.options).map((option) => ({
        id: option.id,
        optionText: option.optionText
      }))
    };
  }

  if (question.questionType === "MATCH_PAIR") {
    const leftItems = question.matchPairs.map((pair) => ({
      id: pair.id,
      text: pair.leftText
    }));

    const rightItems = question.matchPairs.map((pair) => ({
      id: pair.id,
      text: pair.rightText
    }));

    return {
      ...baseQuestion,
      leftItems: shuffleArray(leftItems),
      rightItems: shuffleArray(rightItems)
    };
  }

  if (question.questionType === "WRONG_PAIR") {
    return {
      ...baseQuestion,
      pairs: shuffleArray(question.matchPairs).map((pair) => ({
        id: pair.id,
        leftText: pair.leftText,
        rightText: pair.rightText
      }))
    };
  }

  if (
    ["TRUE_FALSE", "CORRELATION", "ONE_WORD", "FILL_BLANK"].includes(
      question.questionType
    )
  ) {
    return baseQuestion;
  }

  return baseQuestion;
};
