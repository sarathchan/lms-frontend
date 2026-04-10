/** Course-linked academic question bank (API: question-bank/entries). */
export type CourseBankListItem = {
  id: string
  questionText: string
  subject: string
  chapter: string
  topic: string
  type: string
  difficulty: string
  marks: number
  negativeMarks: number
  tags: string[]
  isApproved: boolean
  createdBy: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
  } | null
  updatedAt: string
  module: { id: string; title: string }
  course: { id: string; title: string }
}

export type CourseBankDetail = CourseBankListItem & {
  options: unknown
  correctIndex: number | null
  blanks: unknown
  correctAnswer: unknown
  explanation: string | null
  createdById?: string | null
  courseId: string
  moduleId: string
}

/** @deprecated NEET bank types — use CourseBank* for course question bank. */
export type BankListItem = {
  id: string
  prompt: string
  topic: string
  subject: string
  chapter: string
  bankType: string
  bankDifficulty: string
  marks: number
  negativeMarks: number
  tags: string[]
  pyqYear: number | null
  isPyq: boolean
  isActive: boolean
  approvalStatus: string
  version: number
  createdBy: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
  } | null
  updatedAt: string
}

export type BankQuestionDetail = BankListItem & {
  options: unknown
  correctIndex: number | null
  correctAnswer: unknown
  explanation: string
  createdById?: string | null
}
