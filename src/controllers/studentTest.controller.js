import prisma from "../config/db.js";
import { formatQuestionForStudent } from "../utils/questionFormatter.js";
import { checkQuestionAnswer } from "../utils/answerChecker.js";

const checkStudentAccessToModule = async ({ userId, moduleId }) => {
  const access = await prisma.studentAccess.findUnique({
    where: {
      userId_moduleId: {
        userId,
        moduleId
      }
    }
  });

  return access && access.isActive;
};

export const getMyAvailableTests = async (req, res, next) => {
  try {
    const accesses = await prisma.studentAccess.findMany({
      where: {
        userId: req.user.id,
        isActive: true
      },
      select: {
        moduleId: true
      }
    });

    const moduleIds = accesses.map((access) => access.moduleId);

    if (moduleIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        tests: []
      });
    }

    const tests = await prisma.test.findMany({
      where: {
        status: "PUBLISHED",
        moduleId: {
          in: moduleIds
        }
      },
      include: {
        module: true,
        attempts: {
          where: {
            userId: req.user.id
          },
          select: {
            id: true,
            status: true,
            startedAt: true,
            submittedAt: true,
            endsAt: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const formattedTests = tests.map((test) => ({
      id: test.id,
      title: test.title,
      description: test.description,
      subject: test.subject,
      durationMinutes: test.durationMinutes,
      totalMarks: test.totalMarks,
      module: {
        id: test.module.id,
        name: test.module.name
      },
      attempt: test.attempts[0] || null,
      canStart:
        !test.attempts[0] ||
        test.attempts[0].status === "EXPIRED"
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

export const getStudentTestInstructions = async (req, res, next) => {
  try {
    const { testId } = req.params;

    const test = await prisma.test.findUnique({
      where: {
        id: testId
      },
      include: {
        module: true,
        questions: {
          select: {
            id: true,
            marks: true
          }
        },
        attempts: {
          where: {
            userId: req.user.id
          }
        }
      }
    });

    if (!test) {
      res.status(404);
      throw new Error("Test not found");
    }

    if (test.status !== "PUBLISHED") {
      res.status(403);
      throw new Error("Test is not available");
    }

    const hasAccess = await checkStudentAccessToModule({
      userId: req.user.id,
      moduleId: test.moduleId
    });

    if (!hasAccess) {
      res.status(403);
      throw new Error("You have not purchased this module");
    }

    const existingAttempt = test.attempts[0] || null;

    res.status(200).json({
      success: true,
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        instructions: test.instructions,
        subject: test.subject,
        durationMinutes: test.durationMinutes,
        totalMarks: test.totalMarks,
        questionCount: test.questions.length,
        module: {
          id: test.module.id,
          name: test.module.name
        },
        attempt: existingAttempt
          ? {
              id: existingAttempt.id,
              status: existingAttempt.status,
              startedAt: existingAttempt.startedAt,
              submittedAt: existingAttempt.submittedAt,
              endsAt: existingAttempt.endsAt
            }
          : null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const startTestAttempt = async (req, res, next) => {
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

    if (test.status !== "PUBLISHED") {
      res.status(403);
      throw new Error("Test is not published");
    }

    if (test.questions.length === 0) {
      res.status(400);
      throw new Error("Test has no questions");
    }

    const hasAccess = await checkStudentAccessToModule({
      userId: req.user.id,
      moduleId: test.moduleId
    });

    if (!hasAccess) {
      res.status(403);
      throw new Error("You have not purchased this module");
    }

    const existingAttempt = await prisma.testAttempt.findUnique({
      where: {
        userId_testId: {
          userId: req.user.id,
          testId
        }
      }
    });

    if (existingAttempt) {
      if (existingAttempt.status === "IN_PROGRESS") {
        return res.status(200).json({
          success: true,
          message: "Existing attempt resumed",
          attempt: existingAttempt
        });
      }

      res.status(400);
      throw new Error("You have already attempted this test");
    }

    const startedAt = new Date();
    const endsAt = new Date(
      startedAt.getTime() + test.durationMinutes * 60 * 1000
    );

    const attempt = await prisma.testAttempt.create({
      data: {
        userId: req.user.id,
        testId: test.id,
        durationMinutes: test.durationMinutes,
        startedAt,
        endsAt,
        status: "IN_PROGRESS"
      }
    });

    res.status(201).json({
      success: true,
      message: "Test started successfully",
      attempt
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentAttemptQuestions = async (req, res, next) => {
  try {
    const { attemptId } = req.params;

    const attempt = await prisma.testAttempt.findUnique({
      where: {
        id: attemptId
      },
      include: {
        test: {
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
        }
      }
    });

    if (!attempt) {
      res.status(404);
      throw new Error("Attempt not found");
    }

    if (attempt.userId !== req.user.id) {
      res.status(403);
      throw new Error("This attempt does not belong to you");
    }

    if (attempt.status !== "IN_PROGRESS") {
      res.status(400);
      throw new Error("This attempt is not active");
    }

    const now = new Date();

    if (now > attempt.endsAt) {
      await prisma.testAttempt.update({
        where: {
          id: attempt.id
        },
        data: {
          status: "EXPIRED"
        }
      });

      res.status(400);
      throw new Error("Test time is over");
    }

    const safeQuestions = attempt.test.questions.map(formatQuestionForStudent);

    res.status(200).json({
      success: true,
      attempt: {
        id: attempt.id,
        startedAt: attempt.startedAt,
        endsAt: attempt.endsAt,
        status: attempt.status
      },
      test: {
        id: attempt.test.id,
        title: attempt.test.title,
        description: attempt.test.description,
        instructions: attempt.test.instructions,
        subject: attempt.test.subject,
        durationMinutes: attempt.test.durationMinutes,
        totalMarks: attempt.test.totalMarks,
        module: {
          id: attempt.test.module.id,
          name: attempt.test.module.name
        },
        questions: safeQuestions
      }
    });
  } catch (error) {
    next(error);
  }
};

export const saveAnswer = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { questionId, answer } = req.body;

    if (!questionId) {
      res.status(400);
      throw new Error("questionId is required");
    }

    const attempt = await prisma.testAttempt.findUnique({
      where: {
        id: attemptId
      },
      include: {
        test: {
          include: {
            questions: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    if (!attempt) {
      res.status(404);
      throw new Error("Attempt not found");
    }

    if (attempt.userId !== req.user.id) {
      res.status(403);
      throw new Error("This attempt does not belong to you");
    }

    if (attempt.status !== "IN_PROGRESS") {
      res.status(400);
      throw new Error("Attempt is not active");
    }

    const now = new Date();

    if (now > attempt.endsAt) {
      await prisma.testAttempt.update({
        where: {
          id: attempt.id
        },
        data: {
          status: "EXPIRED"
        }
      });

      res.status(400);
      throw new Error("Time is over");
    }

    const questionBelongsToTest = attempt.test.questions.some(
      (question) => question.id === questionId
    );

    if (!questionBelongsToTest) {
      res.status(400);
      throw new Error("Question does not belong to this test");
    }

    const savedAnswer = await prisma.studentAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId
        }
      },
      update: {
        answerJson: JSON.stringify(answer),
        isCorrect: null,
        marksAwarded: 0
      },
      create: {
        attemptId,
        questionId,
        answerJson: JSON.stringify(answer)
      }
    });

    res.status(200).json({
      success: true,
      message: "Answer saved",
      answer: savedAnswer
    });
  } catch (error) {
    next(error);
  }
};

export const getSavedAnswers = async (req, res, next) => {
  try {
    const { attemptId } = req.params;

    const attempt = await prisma.testAttempt.findUnique({
      where: {
        id: attemptId
      }
    });

    if (!attempt) {
      res.status(404);
      throw new Error("Attempt not found");
    }

    if (attempt.userId !== req.user.id) {
      res.status(403);
      throw new Error("This attempt does not belong to you");
    }

    const answers = await prisma.studentAnswer.findMany({
      where: {
        attemptId
      }
    });

    const formattedAnswers = {};

    answers.forEach((answer) => {
      try {
        formattedAnswers[answer.questionId] = JSON.parse(answer.answerJson);
      } catch {
        formattedAnswers[answer.questionId] = "";
      }
    });

    res.status(200).json({
      success: true,
      answers: formattedAnswers
    });
  } catch (error) {
    next(error);
  }
};

export const submitTestAttempt = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { answers = {}, autoSubmitted = false } = req.body;

    const attempt = await prisma.testAttempt.findUnique({
      where: {
        id: attemptId
      },
      include: {
        test: {
          include: {
            questions: {
              include: {
                options: true,
                matchPairs: true
              }
            }
          }
        }
      }
    });

    if (!attempt) {
      res.status(404);
      throw new Error("Attempt not found");
    }

    if (attempt.userId !== req.user.id) {
      res.status(403);
      throw new Error("This attempt does not belong to you");
    }

    if (attempt.status !== "IN_PROGRESS") {
      res.status(400);
      throw new Error("Attempt is already submitted or closed");
    }

    const now = new Date();

    const graceMs = 5000;
    const isLate = now.getTime() > attempt.endsAt.getTime() + graceMs;

    if (isLate && !autoSubmitted) {
      res.status(400);
      throw new Error("Time is over. Test must be auto-submitted.");
    }

    await prisma.$transaction(async (tx) => {
      // Save latest answers from frontend before checking
      for (const questionId of Object.keys(answers)) {
        await tx.studentAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId,
              questionId
            }
          },
          update: {
            answerJson: JSON.stringify(answers[questionId])
          },
          create: {
            attemptId,
            questionId,
            answerJson: JSON.stringify(answers[questionId])
          }
        });
      }

      const savedAnswers = await tx.studentAnswer.findMany({
        where: {
          attemptId
        }
      });

      let totalScore = 0;

      for (const question of attempt.test.questions) {
        const studentAnswer = savedAnswers.find(
          (answer) => answer.questionId === question.id
        );

        if (!studentAnswer) {
          await tx.studentAnswer.upsert({
            where: {
              attemptId_questionId: {
                attemptId,
                questionId: question.id
              }
            },
            update: {
              isCorrect: false,
              marksAwarded: 0
            },
            create: {
              attemptId,
              questionId: question.id,
              answerJson: JSON.stringify(""),
              isCorrect: false,
              marksAwarded: 0
            }
          });

          continue;
        }

        const result = checkQuestionAnswer({
          question,
          studentAnswer
        });

        totalScore += result.marksAwarded;

        await tx.studentAnswer.update({
          where: {
            id: studentAnswer.id
          },
          data: {
            isCorrect: result.isCorrect,
            marksAwarded: result.marksAwarded
          }
        });
      }

      await tx.testAttempt.update({
        where: {
          id: attemptId
        },
        data: {
          status: "AUTO_CHECKED",
          submittedAt: now,
          totalScore
        }
      });
    });

    res.status(200).json({
      success: true,
      message: autoSubmitted
        ? "Time ended. Test auto-submitted successfully."
        : "Test submitted successfully."
    });
  } catch (error) {
    next(error);
  }
};

export const getAttemptResult = async (req, res, next) => {
  try {
    const { attemptId } = req.params;

    const attempt = await prisma.testAttempt.findUnique({
      where: {
        id: attemptId
      },
      include: {
        test: {
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
        },
        answers: true
      }
    });

    if (!attempt) {
      res.status(404);
      throw new Error("Attempt not found");
    }

    if (attempt.userId !== req.user.id) {
      res.status(403);
      throw new Error("This result does not belong to you");
    }

    if (attempt.status === "IN_PROGRESS") {
      res.status(400);
      throw new Error("Test is not submitted yet");
    }

    const answersMap = {};

    attempt.answers.forEach((answer) => {
      answersMap[answer.questionId] = answer;
    });

    const questions = attempt.test.questions.map((question) => {
      const studentAnswer = answersMap[question.id];

      return {
        id: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        marks: question.marks,
        orderNo: question.orderNo,
        correctAnswer: question.correctAnswer,
        options: question.options,
        matchPairs: question.matchPairs,
        studentAnswer: studentAnswer
          ? {
              answer: JSON.parse(studentAnswer.answerJson || "null"),
              isCorrect: studentAnswer.isCorrect,
              marksAwarded: studentAnswer.marksAwarded
            }
          : null
      };
    });

    res.status(200).json({
      success: true,
      result: {
        attemptId: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        totalScore: attempt.totalScore,
        totalMarks: attempt.test.totalMarks,
        test: {
          id: attempt.test.id,
          title: attempt.test.title,
          subject: attempt.test.subject,
          module: attempt.test.module.name
        },
        questions
      }
    });
  } catch (error) {
    next(error);
  }
};

