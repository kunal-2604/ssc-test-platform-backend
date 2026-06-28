const normalizeText = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

const parseAnswerJson = (answerJson) => {
  try {
    return JSON.parse(answerJson || "null");
  } catch {
    return null;
  }
};

export const checkQuestionAnswer = ({ question, studentAnswer }) => {
  const answer = parseAnswerJson(studentAnswer.answerJson);

  if (answer === null || answer === undefined || answer === "") {
    return {
      isCorrect: false,
      marksAwarded: 0
    };
  }

  if (question.questionType === "MCQ" || question.questionType === "ODD_ONE_OUT") {
    const correctOption = question.options.find((option) => option.isCorrect);

    const isCorrect = correctOption?.id === answer;

    return {
      isCorrect,
      marksAwarded: isCorrect ? question.marks : 0
    };
  }

  if (question.questionType === "TRUE_FALSE") {
    const isCorrect =
      normalizeText(answer) === normalizeText(question.correctAnswer);

    return {
      isCorrect,
      marksAwarded: isCorrect ? question.marks : 0
    };
  }

  if (
    ["CORRELATION", "ONE_WORD", "FILL_BLANK"].includes(question.questionType)
  ) {
    const isCorrect =
      normalizeText(answer) === normalizeText(question.correctAnswer);

    return {
      isCorrect,
      marksAwarded: isCorrect ? question.marks : 0
    };
  }

  if (question.questionType === "WRONG_PAIR") {
    const selectedPair = question.matchPairs.find((pair) => pair.id === answer);

    const isCorrect = selectedPair?.isWrong === true;

    return {
      isCorrect,
      marksAwarded: isCorrect ? question.marks : 0
    };
  }

  if (question.questionType === "MATCH_PAIR") {
    // answer format:
    // {
    //   "leftPairId1": "selectedRightPairId1",
    //   "leftPairId2": "selectedRightPairId2"
    // }

    if (!answer || typeof answer !== "object") {
      return {
        isCorrect: false,
        marksAwarded: 0
      };
    }

    let correctCount = 0;

    for (const pair of question.matchPairs) {
      if (answer[pair.id] === pair.id) {
        correctCount++;
      }
    }

    const totalPairs = question.matchPairs.length;

    const isCorrect = correctCount === totalPairs;

    const marksAwarded = Math.floor((correctCount / totalPairs) * question.marks);

    return {
      isCorrect,
      marksAwarded
    };
  }

  return {
    isCorrect: false,
    marksAwarded: 0
  };
};
