import { lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useParams,
} from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { StaffRoute } from './components/StaffRoute'
import { LoginPage } from './features/auth/LoginPage'
import { RouteLoadingFallback } from './components/feedback/RouteLoadingFallback'
import { NeetStaffOnlyRoute } from './features/neet/NeetStaffOnlyRoute'

function RedirectNeetResultToAnalysis() {
  const { attemptId } = useParams<{ attemptId: string }>()
  return <Navigate to={`/analysis/${attemptId}`} replace />
}

const DashboardHome = lazy(() =>
  import('./features/dashboard/DashboardHome').then((m) => ({
    default: m.DashboardHome,
  })),
)
const StudentDashboard = lazy(() =>
  import('./features/dashboard/StudentDashboard').then((m) => ({
    default: m.StudentDashboard,
  })),
)
const CoursesPage = lazy(() =>
  import('./features/courses/CoursesPage').then((m) => ({
    default: m.CoursesPage,
  })),
)
const SubjectCoursesPage = lazy(() =>
  import('./features/subjects/SubjectCoursesPage').then((m) => ({
    default: m.SubjectCoursesPage,
  })),
)
const CourseEntryPage = lazy(() =>
  import('./features/courses/CourseEntryPage').then((m) => ({
    default: m.CourseEntryPage,
  })),
)
const CourseChapterPage = lazy(() =>
  import('./features/courses/CourseChapterPage').then((m) => ({
    default: m.CourseChapterPage,
  })),
)
const ChapterPracticePage = lazy(() =>
  import('./features/courses/ChapterPracticePage').then((m) => ({
    default: m.ChapterPracticePage,
  })),
)
const UsersPage = lazy(() =>
  import('./features/users/UsersPage').then((m) => ({ default: m.UsersPage })),
)
const TeamsPage = lazy(() =>
  import('./features/teams/TeamsPage').then((m) => ({ default: m.TeamsPage })),
)
const SearchPage = lazy(() =>
  import('./features/search/SearchPage').then((m) => ({
    default: m.SearchPage,
  })),
)
const AttendancePage = lazy(() =>
  import('./features/attendance/AttendancePage').then((m) => ({
    default: m.AttendancePage,
  })),
)
const MyAttendancePage = lazy(() =>
  import('./features/attendance/MyAttendancePage').then((m) => ({
    default: m.MyAttendancePage,
  })),
)
const FocusedLearningLayout = lazy(() =>
  import('./features/learn/FocusedLearningLayout').then((m) => ({
    default: m.FocusedLearningLayout,
  })),
)
const LearnLessonPage = lazy(() =>
  import('./features/learn/LearnLessonPage').then((m) => ({
    default: m.LearnLessonPage,
  })),
)
const AssessmentIntroPage = lazy(() =>
  import('./features/assessment/AssessmentIntroPage').then((m) => ({
    default: m.AssessmentIntroPage,
  })),
)
const AssessmentTakePage = lazy(() =>
  import('./features/assessment/AssessmentTakePage').then((m) => ({
    default: m.AssessmentTakePage,
  })),
)
const AssessmentResultPage = lazy(() =>
  import('./features/assessment/AssessmentResultPage').then((m) => ({
    default: m.AssessmentResultPage,
  })),
)
const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  })),
)
const ReportsPage = lazy(() =>
  import('./features/reports/ReportsPage').then((m) => ({
    default: m.ReportsPage,
  })),
)
const CommunicationListPage = lazy(() =>
  import('./features/communication/CommunicationListPage.tsx').then((m) => ({
    default: m.CommunicationListPage,
  })),
)
const CommunicationAdminPage = lazy(() =>
  import('./features/communication/CommunicationAdminPage.tsx').then((m) => ({
    default: m.CommunicationAdminPage,
  })),
)
const CommunicationQuestionsPage = lazy(() =>
  import('./features/communication/CommunicationQuestionsPage').then((m) => ({
    default: m.CommunicationQuestionsPage,
  })),
)
const CommunicationTestsPage = lazy(() =>
  import('./features/communication/CommunicationTestsPage').then((m) => ({
    default: m.CommunicationTestsPage,
  })),
)
const CommunicationAssignPage = lazy(() =>
  import('./features/communication/CommunicationAssignPage').then((m) => ({
    default: m.CommunicationAssignPage,
  })),
)
const CommunicationTakePage = lazy(() =>
  import('./features/communication/CommunicationTakePage').then((m) => ({
    default: m.CommunicationTakePage,
  })),
)
const CommunicationResultPage = lazy(() =>
  import('./features/communication/CommunicationResultPage').then((m) => ({
    default: m.CommunicationResultPage,
  })),
)
const NeetHomePage = lazy(() =>
  import('./features/neet/NeetHomePage').then((m) => ({ default: m.NeetHomePage })),
)
const NeetExamPage = lazy(() =>
  import('./features/neet/NeetExamPage').then((m) => ({ default: m.NeetExamPage })),
)
const NeetAnalyticsPage = lazy(() =>
  import('./features/neet/NeetAnalyticsPage').then((m) => ({
    default: m.NeetAnalyticsPage,
  })),
)
const NeetPyqPage = lazy(() =>
  import('./features/neet/NeetPyqPage').then((m) => ({ default: m.NeetPyqPage })),
)
const NeetLeaderboardPage = lazy(() =>
  import('./features/neet/NeetLeaderboardPage').then((m) => ({
    default: m.NeetLeaderboardPage,
  })),
)
const NeetRevisionPage = lazy(() =>
  import('./features/neet/NeetRevisionPage').then((m) => ({
    default: m.NeetRevisionPage,
  })),
)
const NeetDailyPage = lazy(() =>
  import('./features/neet/NeetDailyPage').then((m) => ({
    default: m.NeetDailyPage,
  })),
)
const NeetTestAnalysisPage = lazy(() =>
  import('./features/neet/NeetTestAnalysisPage').then((m) => ({
    default: m.NeetTestAnalysisPage,
  })),
)
const QuestionBankPage = lazy(() =>
  import('./features/questions/QuestionBankPage').then((m) => ({
    default: m.QuestionBankPage,
  })),
)
const QuestionFormPage = lazy(() =>
  import('./features/questions/QuestionFormPage').then((m) => ({
    default: m.QuestionFormPage,
  })),
)
const BulkUploadPage = lazy(() =>
  import('./features/questions/BulkUploadPage').then((m) => ({
    default: m.BulkUploadPage,
  })),
)
const ProgramsPage = lazy(() =>
  import('./features/programs/ProgramsPage').then((m) => ({ default: m.ProgramsPage })),
)
const ProgramDetailPage = lazy(() =>
  import('./features/programs/ProgramDetailPage').then((m) => ({
    default: m.ProgramDetailPage,
  })),
)

/** Shown only while a *layout* chunk suspends (e.g. focused learn shell). Must fill the viewport so we never flash an empty/dark frame. */
function LayoutChunkFallback() {
  return <RouteLoadingFallback layout="fullscreen" />
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<LayoutChunkFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <FocusedLearningLayout />
                </ProtectedRoute>
              }
            >
              <Route
                path="/learn/:courseId/:moduleId/:lessonId"
                element={<LearnLessonPage />}
              />
              <Route
                path="/assessment/:quizId"
                element={<AssessmentIntroPage />}
              />
              <Route
                path="/assessment/:quizId/take"
                element={<AssessmentTakePage />}
              />
              <Route
                path="/assessment/:quizId/result/:attemptId"
                element={<AssessmentResultPage />}
              />
              <Route path="/neet/exam/:attemptId" element={<NeetExamPage />} />
            </Route>
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardHome />} />
              <Route element={<NeetStaffOnlyRoute />}>
                <Route path="/neet" element={<NeetHomePage />} />
                <Route path="/neet/analytics" element={<NeetAnalyticsPage />} />
                <Route path="/neet/pyq" element={<NeetPyqPage />} />
                <Route path="/neet/leaderboard" element={<NeetLeaderboardPage />} />
                <Route path="/neet/revision" element={<NeetRevisionPage />} />
                <Route path="/neet/daily" element={<NeetDailyPage />} />
              </Route>
              <Route
                path="/neet/result/:attemptId"
                element={<RedirectNeetResultToAnalysis />}
              />
              <Route path="/analysis/:testId" element={<NeetTestAnalysisPage />} />
              <Route path="/learn" element={<StudentDashboard />} />
              <Route path="/subjects/:subjectId" element={<SubjectCoursesPage />} />
              <Route path="/my-attendance" element={<MyAttendancePage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:courseId" element={<CourseEntryPage />} />
              <Route
                path="/courses/:courseId/chapter/:chapterId"
                element={<CourseChapterPage />}
              />
              <Route
                path="/courses/:courseId/chapter/:chapterId/practice"
                element={<ChapterPracticePage />}
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/communication" element={<Outlet />}>
                <Route index element={<CommunicationListPage />} />
                <Route
                  path="result/:attemptId"
                  element={<CommunicationResultPage />}
                />
                <Route element={<StaffRoute />}>
                  <Route
                    path="questions"
                    element={<CommunicationQuestionsPage />}
                  />
                  <Route path="tests" element={<CommunicationTestsPage />} />
                  <Route path="assign" element={<CommunicationAssignPage />} />
                  <Route path="admin" element={<CommunicationAdminPage />} />
                </Route>
                <Route path=":testId" element={<CommunicationTakePage />} />
              </Route>
              <Route element={<StaffRoute />}>
                <Route path="/users" element={<UsersPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/questions" element={<QuestionBankPage />} />
                <Route path="/questions/new" element={<QuestionFormPage />} />
                <Route path="/questions/bulk" element={<BulkUploadPage />} />
                <Route path="/questions/:id/edit" element={<QuestionFormPage />} />
                <Route path="/programs" element={<ProgramsPage />} />
                <Route path="/programs/:programId" element={<ProgramDetailPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
