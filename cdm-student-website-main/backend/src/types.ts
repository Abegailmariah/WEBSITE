export interface Announcement {
  id?: number;
  title: string;
  date: string;
  priority: "Critical" | "Normal";
  content: string;
  created_at?: string;
}

export interface Concern {
  id?: number;
  last_name: string;
  first_name: string;
  middle_name?: string;
  student_number: string;
  section: string;
  institute: string;
  program: string;
  type: "Complaint" | "Question" | "Suggestion";
  message: string;
  status?: "Pending" | "Read" | "Resolved";
  created_at?: string;
}
