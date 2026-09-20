export interface Announcement {
  id?: number;
  title: string;
  date: string;
  priority: "Critical" | "Normal";
  /** Campus area this announcement applies to (mirrored to the BLE beacon in that area). */
  area: string;
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
  response?: string;
  created_at?: string;
}

export interface AuditLog {
  id?: number;
  action: string;
  detail?: string;
  /** Origin IP of the actor, recorded for incident forensics. */
  ip?: string;
  /** Truncated user agent of the actor, recorded for incident forensics. */
  user_agent?: string;
  created_at?: string;
}


export interface Student {
  id?: number;
  student_number: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  section: string;
  institute: string;
  program: string;
  password_hash: string;
  created_at?: string;
}
