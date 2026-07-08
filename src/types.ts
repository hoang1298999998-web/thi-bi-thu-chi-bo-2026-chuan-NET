export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: 'admin' | 'organizer' | 'judge' | 'candidate';
  title: string;
  department: string;
  chiBo?: string;
  avatar: string;
  username?: string;
  status?: string;
  createdAt?: string;
  lastLogin?: string;
}

export interface Department {
  id: string;
  name: string;
  battalion: string;
  company: string;
}

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  type: 'text' | 'image' | 'video' | 'pdf';
  attachmentUrl?: string;
  category?: string;
  topic?: string;
  difficulty?: string;
}

export interface ExamResult {
  id: string;
  userEmail: string;
  userName: string;
  userDepartment: string;
  userChiBo?: string;
  userPhone?: string;
  userTitle?: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  date: string;
  type: 'practice' | 'official';
  answers?: { [key: number]: number }; // Stores answer map (questionId -> selected index)
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  imageUrl: string;
  date: string;
  comments: {
    user: string;
    text: string;
    date: string;
  }[];
}

export interface StudyDocument {
  id: string;
  title: string;
  format: 'pdf' | 'doc' | 'ppt' | 'video' | 'excel' | 'audio';
  url: string;
  category: string;
  size: string;
  description?: string;
  publisher?: string;
  issueDate?: string;
  author?: string;
  coverImage?: string;
  isHidden?: boolean;
}

export interface AppSettings {
  contestName: string;
  unitLogo: string;
  countdownDate: string;
  theme: 'patriotic' | 'modern';
}

export interface FullDB {
  users: User[];
  departments: Department[];
  questions: Question[];
  exams: {
    isOfficialActive: boolean;
  };
  examsList?: any[];
  examResults: ExamResult[];
  news: NewsArticle[];
  documents: StudyDocument[];
  settings: AppSettings;
  logs?: any[];
}
