import prisma from "../config/db.js";

const calculateTestTotalMarks = async (testId) => {
  const result = await prisma.question.aggregate({
    where: {
      testId
    },
    _sum: {
      marks: true
    }
  });

  const totalMarks = result._sum.marks || 0;

  await prisma.test.update({
    where: {
      id: testId
    },
    data: {
      totalMarks
    }
  });

  return totalMarks;
};

export const createTest = async (req, res, next) => {
  try {
    const {
      title,
      description,
      instructions,
      moduleId,
      subject,
      durationMinutes
    } = req.body;

    if (!title || !moduleId || !subject || !durationMinutes) {
      res.status(400);
      throw new Error("Title, module, subject and duration are required");
    }

    const module = await prisma.module.findUnique({
      where: {
        id: moduleId
      }
    });

    if (!module) {
      res.status(404);
      throw new Error("Module not found");
    }

    if (!module.subjects.includes(subject)) {
      res.status(400);
      throw new Error("Selected subject does not belong to this module");
    }

    const test = await prisma.test.create({
      data: {
        title,
        description,
        instructions,
        moduleId,
        subject,
        durationMinutes: Number(durationMinutes),
        status: "DRAFT"
      },
      include: {
        module: true,
        questions: true
      }
    });

    res.status(201).json({
      success: true,
      message: "Test created successfully",
      test
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminTests = async (req, res, next) => {
  try {
    const tests = await prisma.test.findMany({
      include: {
        module: true,
        questions: {
          select: {
            id: true,
            marks: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const formattedTests = tests.map((test) => ({
      ...test,
      questionCount: test.questions.length
    }));

    res.status(200).json({
      success: true,
      count: formattedTests.length,
      tests: formattedTests
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminTestById = async (req, res, next) => {
  try {
    const { testId } = req.params;

    const test = await prisma.test.findUnique({
      where: {
        id: testId
      },
      include: {
        module: true,
        questions: {
          include: {
            options: true,
            matchPairs: true
          },
          orderBy: {
            orderNo: "asc"
          }
        }
      }
    });

    if (!test) {
      res.status(404);
      throw new Error("Test not found");
    }

    res.status(200).json({
      success: true,
      test
    });
  } catch (error) {
    next(error);
  }
};

export const updateTest = async (req, res, next) => {
  try {
    const { testId } = req.params;

    const {
      title,
      description,
      instructions,
      moduleId,
      subject,
      durationMinutes
    } = req.body;

    const existingTest = await prisma.test.findUnique({
      where: {
        id: testId
      }
    });

    if (!existingTest) {
      res.status(404);
      throw new Error("Test not found");
    }

    if (moduleId && subject) {
      const module = await prisma.module.findUnique({
        where: {
          id: moduleId
        }
      });

      if (!module) {
        res.status(404);
        throw new Error("Module not found");
      }

      if (!module.subjects.includes(subject)) {
        res.status(400);
        throw new Error("Selected subject does not belong to this module");
      }
    }

    const updatedTest = await prisma.test.update({
      where: {
        id: testId
      },
      data: {
        title,
        description,
        instructions,
        moduleId,
        subject,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined
      },
      include: {
        module: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Test updated successfully",
      test: updatedTest
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTest = async (req, res, next) => {
  try {
    const { testId } = req.params;

    const test = await prisma.test.findUnique({
      where: {
        id: testId
      }
    });

    if (!test) {
      res.status(404);
      throw new Error("Test not found");
    }

    await prisma.test.delete({
      where: {
        id: testId
      }
    });

    res.status(200).json({
      success: true,
      message: "Test deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const publishTest = async (req, res, next) => {
  try {
    const { testId } = req.params;

    const test = await prisma.test.findUnique({
      where: {
        id: testId
      },
      include: {
        questions: true
      }
    });

    if (!test) {
      res.status(404);
      throw new Error("Test not found");
    }

    if (test.questions.length === 0) {
      res.status(400);
      throw new Error("Cannot publish test without questions");
    }

    const updatedTest = await prisma.test.update({
      where: {
        id: testId
      },
      data: {
        status: "PUBLISHED"
      }
    });

    res.status(200).json({
      success: true,
      message: "Test published successfully",
      test: updatedTest
    });
  } catch (error) {
    next(error);
  }
};

export const unpublishTest = async (req, res, next) => {
  try {
    const { testId } = req.params;

    const test = await prisma.test.findUnique({
      where: {
        id: testId
      }
    });

    if (!test) {
      res.status(404);
      throw new Error("Test not found");
    }

    const updatedTest = await prisma.test.update({
      where: {
        id: testId
      },
      data: {
        status: "UNPUBLISHED"
      }
    });

    res.status(200).json({
      success: true,
      message: "Test unpublished successfully",
      test: updatedTest
    });
  } catch (error) {
    next(error);
  }
};

export const addQuestion = async (req, res, next) => {
  try {
    const { testId } = req.params;

    const {
      questionText,
      questionType,
      marks,
      correctAnswer,
      explanation,
      options,
      matchPairs
    } = req.body;

    if (!questionText || !questionType || !marks) {
      res.status(400);
      throw new Error("Question text, type and marks are required");
    }

    const allowedTypes = [
      "MCQ",
      "MATCH_PAIR",
      "ODD_ONE_OUT",
      "TRUE_FALSE",
      "WRONG_PAIR",
      "CORRELATION",
      "ONE_WORD",
      "FILL_BLANK"
    ];

    if (!allowedTypes.includes(questionType)) {
      res.status(400);
      throw new Error("Invalid question type");
    }

    const test = await prisma.test.findUnique({
      where: {
        id: testId
      },
      include: {
        questions: true
      }
    });

    if (!test) {
      res.status(404);
      throw new Error("Test not found");
    }

    if (questionType === "MCQ" || questionType === "ODD_ONE_OUT") {
      if (!options || options.length < 2) {
        res.status(400);
        throw new Error(`${questionType} must have at least 2 options`);
      }

      const validOptions = options.filter(
        (option) => option.optionText && option.optionText.trim() !== ""
      );

      if (validOptions.length < 2) {
        res.status(400);
        throw new Error(`${questionType} must have at least 2 valid options`);
      }

      const correctOptions = validOptions.filter((option) => option.isCorrect);

      if (correctOptions.length !== 1) {
        res.status(400);
        throw new Error(`${questionType} must have exactly one correct option`);
      }
    }

    if (questionType === "TRUE_FALSE") {
      if (!["true", "false", "TRUE", "FALSE", true, false].includes(correctAnswer)) {
        res.status(400);
        throw new Error("True/False question must have correct answer true or false");
      }
    }

    if (["CORRELATION", "ONE_WORD", "FILL_BLANK"].includes(questionType)) {
      if (!correctAnswer || String(correctAnswer).trim() === "") {
        res.status(400);
        throw new Error(`${questionType} question must have correct answer`);
      }
    }

    if (questionType === "MATCH_PAIR") {
      if (!matchPairs || matchPairs.length < 2) {
        res.status(400);
        throw new Error("Match the Pair question must have at least 2 pairs");
      }

      const validPairs = matchPairs.filter(
        (pair) =>
          pair.leftText &&
          pair.leftText.trim() !== "" &&
          pair.rightText &&
          pair.rightText.trim() !== ""
      );

      if (validPairs.length < 2) {
        res.status(400);
        throw new Error("Match the Pair question must have at least 2 valid pairs");
      }
    }

    if (questionType === "WRONG_PAIR") {
      if (!matchPairs || matchPairs.length < 2) {
        res.status(400);
        throw new Error("Wrong Pair question must have at least 2 pairs");
      }

      const validPairs = matchPairs.filter(
        (pair) =>
          pair.leftText &&
          pair.leftText.trim() !== "" &&
          pair.rightText &&
          pair.rightText.trim() !== ""
      );

      if (validPairs.length < 2) {
        res.status(400);
        throw new Error("Wrong Pair question must have at least 2 valid pairs");
      }

      const wrongPairs = validPairs.filter((pair) => pair.isWrong);

      if (wrongPairs.length !== 1) {
        res.status(400);
        throw new Error("Wrong Pair question must have exactly one wrong pair selected");
      }
    }

    const orderNo = test.questions.length + 1;

    const question = await prisma.question.create({
      data: {
        testId,
        questionText,
        questionType,
        marks: Number(marks),
        orderNo,
        correctAnswer:
          questionType === "TRUE_FALSE"
            ? String(correctAnswer).toLowerCase()
            : correctAnswer || null,
        explanation: explanation || null,

        options:
          questionType === "MCQ" || questionType === "ODD_ONE_OUT"
            ? {
                create: options
                  .filter(
                    (option) =>
                      option.optionText && option.optionText.trim() !== ""
                  )
                  .map((option) => ({
                    optionText: option.optionText,
                    isCorrect: Boolean(option.isCorrect)
                  }))
              }
            : undefined,

        matchPairs:
          questionType === "MATCH_PAIR" || questionType === "WRONG_PAIR"
            ? {
                create: matchPairs
                  .filter(
                    (pair) =>
                      pair.leftText &&
                      pair.leftText.trim() !== "" &&
                      pair.rightText &&
                      pair.rightText.trim() !== ""
                  )
                  .map((pair) => ({
                    leftText: pair.leftText,
                    rightText: pair.rightText,
                    isWrong:
                      questionType === "WRONG_PAIR"
                        ? Boolean(pair.isWrong)
                        : false
                  }))
              }
            : undefined
      },
      include: {
        options: true,
        matchPairs: true
      }
    });

    const totalMarks = await calculateTestTotalMarks(testId);

    res.status(201).json({
      success: true,
      message: "Question added successfully",
      question,
      totalMarks
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;

    const question = await prisma.question.findUnique({
      where: {
        id: questionId
      }
    });

    if (!question) {
      res.status(404);
      throw new Error("Question not found");
    }

    const testId = question.testId;

    await prisma.question.delete({
      where: {
        id: questionId
      }
    });

    const remainingQuestions = await prisma.question.findMany({
      where: {
        testId
      },
      orderBy: {
        orderNo: "asc"
      }
    });

    for (let i = 0; i < remainingQuestions.length; i++) {
      await prisma.question.update({
        where: {
          id: remainingQuestions[i].id
        },
        data: {
          orderNo: i + 1
        }
      });
    }

    const totalMarks = await calculateTestTotalMarks(testId);

    res.status(200).json({
      success: true,
      message: "Question deleted successfully",
      totalMarks
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminTestAttempts = async (req, res, next) => {
  try {
    const { testId } = req.params;

    const test = await prisma.test.findUnique({
      where: {
        id: testId
      },
      select: {
        id: true,
        title: true
      }
    });

    if (!test) {
      res.status(404);
      throw new Error("Test not found");
    }

    const attempts = await prisma.testAttempt.findMany({
      where: {
        testId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    res.status(200).json({
      success: true,
      test,
      count: attempts.length,
      attempts
    });
  } catch (error) {
    next(error);
  }
};

export const allowStudentReattempt = async (req, res, next) => {
  try {
    const { testId, userId } = req.params;

    const test = await prisma.test.findUnique({
      where: {
        id: testId
      }
    });

    if (!test) {
      res.status(404);
      throw new Error("Test not found");
    }

    const student = await prisma.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!student) {
      res.status(404);
      throw new Error("Student not found");
    }

    if (student.role !== "STUDENT") {
      res.status(400);
      throw new Error("Selected user is not a student");
    }

    const attempt = await prisma.testAttempt.findUnique({
      where: {
        userId_testId: {
          userId,
          testId
        }
      }
    });

    if (!attempt) {
      res.status(404);
      throw new Error("No attempt found for this student and test");
    }

    await prisma.testAttempt.delete({
      where: {
        id: attempt.id
      }
    });

    res.status(200).json({
      success: true,
      message: "Student can now attempt this test again"
    });
  } catch (error) {
    next(error);
  }
};

