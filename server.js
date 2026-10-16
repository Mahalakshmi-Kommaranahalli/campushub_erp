require('dotenv').config();
const express=require('express');
const session=require('express-session');
const path=require('path');
const mysql=require('mysql2/promise');

const app=express();
const PORT=process.env.PORT||3000;
const pool = mysql.createPool(
  process.env.DATABASE_URL
    ? {
        uri: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'false' ? undefined : { rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 10
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'college_management_system',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        waitForConnections: true,
        connectionLimit: 10
      }
);

app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));
app.use(session({secret:process.env.SESSION_SECRET||'campushub-secret',resave:false,saveUninitialized:false,cookie:{httpOnly:true,maxAge:4*60*60*1000}}));

app.use((req, res, next) => {
  res.locals.userRole = req.session.role || null;
  res.locals.currentUser = req.session.admin || null;
  res.locals.studentInfo = req.session.studentInfo || null;
  res.locals.facultyInfo = req.session.facultyInfo || null;
  res.locals.reqQuery = req.query || {};
  next();
});

const nav=[
 ['Dashboard','/dashboard'],
 ['Student Portal','/portal/student'],
 ['Faculty Portal','/portal/faculty'],
 ['Academics & Exams','/portal/academics'],
 ['Administration & HR','/portal/admin-hr'],
 ['Campus Utilities','/portal/utilities'],
 ['All Portals','/portals']
];
const page=(title,data={})=>({title,nav,error:null,...data});

function auth(req,res,next){
  if(!req.session.admin){
    if (req.path.startsWith('/portal/')) return res.redirect('/login?portal=' + req.path.split('/')[2]);
    return res.redirect('/login');
  }

  const role = req.session.role;
  const path = req.path;

  // 1. STRICT STUDENT PORTAL ISOLATION:
  // If student logs in, they can ONLY access student-related features.
  // All other portals and administrative pages are strictly blocked.
  if (role === 'student') {
    const studentAllowed = [
      '/portal/student',
      '/student-profile',
      '/student-attendance',
      '/cie-marks',
      '/see-marks',
      '/results',
      '/fees',
      '/print-bill',
      '/course-registration',
      '/feedback',
      '/leave-approval',
      '/leave-request',
      '/notices',
      '/logout'
    ];
    const ok = studentAllowed.some(p => path === p || path.startsWith(p + '/'));
    if (!ok) {
      return res.redirect('/portal/student?denied=1');
    }
  }

  // 2. STRICT FACULTY PORTAL ISOLATION:
  // If faculty logs in, they can ONLY access faculty-related features.
  if (role === 'faculty') {
    const facultyAllowed = [
      '/portal/faculty',
      '/faculty-profile',
      '/counsellor-allocation',
      '/faculty-attendance',
      '/see-marks',
      '/timetable',
      '/subjects',
      '/courses',
      '/leave-approval',
      '/leave-request',
      '/notices',
      '/logout'
    ];
    const ok = facultyAllowed.some(p => path === p || path.startsWith(p + '/'));
    if (!ok) {
      return res.redirect('/portal/faculty?denied=1');
    }
  }

  // 3. STRICT ACADEMICS & EXAMS PORTAL ISOLATION:
  if (role === 'academics') {
    const academicsAllowed = [
      '/portal/academics',
      '/timetable',
      '/exam-scheduling',
      '/departments',
      '/elective-allocation',
      '/subjects',
      '/courses',
      '/cie-marks',
      '/see-marks',
      '/results',
      '/notices',
      '/admin/add-timetable',
      '/admin/add-exam',
      '/admin/add-subject',
      '/admin/add-department',
      '/logout'
    ];
    const ok = academicsAllowed.some(p => path === p || path.startsWith(p + '/'));
    if (!ok) {
      return res.redirect('/portal/academics?denied=1');
    }
  }

  // 4. STRICT ADMINISTRATION & HR PORTAL ISOLATION:
  if (role === 'admin-hr') {
    const adminHrAllowed = [
      '/portal/admin-hr',
      '/faculty',
      '/faculty-profile',
      '/admissions',
      '/students',
      '/student-profile',
      '/departments',
      '/fees',
      '/print-bill',
      '/leave-approval',
      '/notices',
      '/admin/add-student',
      '/admin/add-faculty',
      '/admin/add-department',
      '/admin/add-notice',
      '/admin/add-fee',
      '/admin/add-attendance',
      '/admin/add-cie-mark',
      '/logout'
    ];
    const ok = adminHrAllowed.some(p => path === p || path.startsWith(p + '/'));
    if (!ok) {
      return res.redirect('/portal/admin-hr?denied=1');
    }
  }

  // 5. STRICT CAMPUS UTILITIES PORTAL ISOLATION:
  if (role === 'utilities') {
    const utilitiesAllowed = [
      '/portal/utilities',
      '/library',
      '/hostels',
      '/placement',
      '/view-feedback',
      '/notices',
      '/admin/add-book',
      '/admin/add-hostel',
      '/admin/add-placement',
      '/logout'
    ];
    const ok = utilitiesAllowed.some(p => path === p || path.startsWith(p + '/'));
    if (!ok) {
      return res.redirect('/portal/utilities?denied=1');
    }
  }

  next();
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function q(sql,params=[]){const [rows]=await pool.execute(sql,params);return rows;}
async function safeQuery(sql,params=[]){try{return {rows:await q(sql,params),error:null};}catch(error){console.error('Database query failed:', error.message);return {rows:[],error};}}
async function safeCount(table){
  try {
    const [rows]=await pool.query(`SELECT COUNT(*) AS c FROM \`${table.replace(/[^a-zA-Z0-9_]/g,'')}\``);
    return {count:Number(rows[0]?.c||0),error:null};
  } catch(error) {
    console.error(`Count failed for ${table}:`, error.message);
    return {count:0,error};
  }
}

app.get('/', async(req,res)=>{
  try{
    const departments=await q('SELECT * FROM department');
    res.render('home',{departments});
  }catch(e){ res.send('Database error: '+e.message); }
});
app.get('/public-department/:id', async(req,res)=>{
  try{
    const depts=await q('SELECT * FROM department WHERE department_id=?',[req.params.id]);
    if(!depts.length) return res.status(404).send('Department not found');
    const faculty=await q('SELECT * FROM faculty WHERE department_id=?',[req.params.id]);
    res.render('department-view',{department:depts[0], faculty});
  }catch(e){ res.send('Database error: '+e.message); }
});
app.get('/portals', (req, res) => {
  if (req.session.role === 'student') return res.redirect('/portal/student');
  if (req.session.role === 'faculty') return res.redirect('/portal/faculty');
  if (req.session.role === 'academics') return res.redirect('/portal/academics');
  if (req.session.role === 'admin-hr') return res.redirect('/portal/admin-hr');
  if (req.session.role === 'utilities') return res.redirect('/portal/utilities');
  res.render('portals-directory');
});

app.get('/login', (req, res) => {
  if (req.session.role === 'student') return res.redirect('/portal/student');
  if (req.session.role === 'faculty') return res.redirect('/portal/faculty');
  if (req.session.role === 'academics') return res.redirect('/portal/academics');
  if (req.session.role === 'admin-hr') return res.redirect('/portal/admin-hr');
  if (req.session.role === 'utilities') return res.redirect('/portal/utilities');
  if (req.session.role === 'admin') return res.redirect('/dashboard');
  res.render('login', { message: null, targetPortal: req.query.portal || 'student' });
});

function normalizeStr(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/\b(prof|dr|mr|mrs|ms|shri)\b\.?/gi, '')
    .replace(/[^a-z0-9]/gi, '');
}

function matchFacultyRecord(facultyList, userCandidate, passCandidate) {
  const normUser = normalizeStr(userCandidate);
  const normPass = normalizeStr(passCandidate);
  const rawUser = String(userCandidate || '').trim().toLowerCase();
  const rawPass = String(passCandidate || '').trim().toLowerCase();
  if (!normUser && !rawUser) return null;

  for (const f of facultyList) {
    const normFac = normalizeStr(f.faculty_name);
    const rawFac = String(f.faculty_name || '').trim().toLowerCase();

    // Check username matches faculty name (normalized or raw) or ID or email
    const userMatches = (
      (normUser && (normFac === normUser || normFac.includes(normUser) || normUser.includes(normFac))) ||
      rawFac.includes(rawUser) ||
      rawUser.includes(rawFac) ||
      (f.email && f.email.toLowerCase().includes(rawUser)) ||
      String(f.faculty_id) === userCandidate.trim()
    );

    if (userMatches) {
      // Check password: password must be their name (or same as username which is their name, or registered phone)
      const passMatches = (
        (normPass && (normPass === normUser || normPass === normFac || normFac.includes(normPass) || normPass.includes(normFac))) ||
        rawPass === rawUser ||
        rawPass === rawFac ||
        (f.phone && f.phone.trim() === passCandidate.trim())
      );
      if (passMatches) return f;
    }
  }
  return null;
}

async function matchStudentRecord(uCandidate, pCandidate) {
  const normUser = String(uCandidate || '').trim().toLowerCase();
  const normPass = String(pCandidate || '').trim().toLowerCase();
  if (!normUser) return null;

  const rows = await q('SELECT * FROM student WHERE LOWER(TRIM(usn)) = ?', [normUser]);
  if (!rows.length) return null;

  const st = rows[0];
  const stUsn = String(st.usn || '').trim().toLowerCase();
  const stPhone = String(st.phone || '').trim().toLowerCase();

  // Password must be their USN (or their registered phone number as fallback)
  if (normPass === stUsn || normPass === normUser || normPass === stPhone) {
    return st;
  }
  return null;
}

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const targetPortal = req.body.targetPortal || req.query.portal || '';

  try {
    // 1. Student Portal Login (USN for both username and password)
    if (targetPortal === 'student') {
      const student = await matchStudentRecord(username, password);
      if (student) {
        req.session.admin = student.student_name;
        req.session.role = 'student';
        req.session.activePortal = 'student';
        req.session.studentInfo = student;
        return res.redirect('/portal/student');
      }
      return res.render('login', { message: 'Invalid Student credentials. Please enter your USN for both Username and Password.', targetPortal });
    }

    // 2. Faculty Portal Login (Faculty Name for both username and password)
    if (targetPortal === 'faculty') {
      const allFaculty = await q('SELECT f.*, d.department_name FROM faculty f LEFT JOIN department d ON f.department_id=d.department_id');
      const faculty = matchFacultyRecord(allFaculty, username, password);
      if (faculty) {
        req.session.admin = faculty.faculty_name;
        req.session.role = 'faculty';
        req.session.activePortal = 'faculty';
        req.session.facultyInfo = faculty;
        return res.redirect('/portal/faculty');
      }
      return res.render('login', { message: 'Invalid Faculty credentials. Please enter your Faculty Name for both Username and Password.', targetPortal });
    }

    // 3. Academics & Exams Portal Login (Present credentials remain intact)
    if (targetPortal === 'academics') {
      const isJitd = (username === 'JITD' && password === 'jitd@123');
      const userRows = await q('SELECT * FROM users WHERE username=? AND password=?', [username, password]);
      if (isJitd || userRows.length) {
        req.session.admin = username;
        req.session.role = 'academics';
        req.session.activePortal = 'academics';
        return res.redirect('/portal/academics');
      }
      return res.render('login', { message: 'Invalid Academics credentials. Access restricted to academic officers.', targetPortal });
    }

    // 4. Administration & HR Portal Login (Present credentials remain intact)
    if (targetPortal === 'admin-hr') {
      const isJitd = (username === 'JITD' && password === 'jitd@123');
      const userRows = await q('SELECT * FROM users WHERE username=? AND password=?', [username, password]);
      if (isJitd || userRows.length) {
        req.session.admin = username;
        req.session.role = 'admin-hr';
        req.session.activePortal = 'admin-hr';
        return res.redirect('/portal/admin-hr');
      }
      return res.render('login', { message: 'Invalid Admin & HR credentials. Access restricted to administrative officers.', targetPortal });
    }

    // 5. Campus Utilities Portal Login (Present credentials remain intact)
    if (targetPortal === 'utilities') {
      const isJitd = (username === 'JITD' && password === 'jitd@123');
      const userRows = await q('SELECT * FROM users WHERE username=? AND password=?', [username, password]);
      if (isJitd || userRows.length) {
        req.session.admin = username;
        req.session.role = 'utilities';
        req.session.activePortal = 'utilities';
        return res.redirect('/portal/utilities');
      }
      return res.render('login', { message: 'Invalid Utilities credentials. Access restricted to utilities officers.', targetPortal });
    }

    // 6. Master Super Admin Credentials (Present credentials remain intact: JITD / jitd@123 or users table)
    if (username === 'JITD' && password === 'jitd@123') {
      req.session.admin = username;
      req.session.role = 'admin';
      req.session.activePortal = 'all';
      return res.redirect('/dashboard');
    }

    const userRows = await q('SELECT * FROM users WHERE username=? AND password=?', [username, password]);
    if (userRows.length) {
      req.session.admin = username;
      req.session.role = 'admin';
      req.session.activePortal = 'all';
      return res.redirect('/dashboard');
    }

    // Auto-detect student login (USN as username & password) if no portal specified
    const student = await matchStudentRecord(username, password);
    if (student) {
      req.session.admin = student.student_name;
      req.session.role = 'student';
      req.session.activePortal = 'student';
      req.session.studentInfo = student;
      return res.redirect('/portal/student');
    }

    // Auto-detect faculty login (Name as username & password) if no portal specified
    const allFaculty = await q('SELECT f.*, d.department_name FROM faculty f LEFT JOIN department d ON f.department_id=d.department_id');
    const faculty = matchFacultyRecord(allFaculty, username, password);
    if (faculty) {
      req.session.admin = faculty.faculty_name;
      req.session.role = 'faculty';
      req.session.activePortal = 'faculty';
      req.session.facultyInfo = faculty;
      return res.redirect('/portal/faculty');
    }
  } catch (e) {
    console.error('Login error:', e.message);
    return res.render('login', { message: 'Database connection error.', targetPortal });
  }

  res.render('login', { message: 'Invalid credentials. Please verify your username and password.', targetPortal });
});

app.get('/admin', (req, res) => {
  if (req.session.role === 'admin') return res.redirect('/dashboard');
  if (req.session.role === 'admin-hr') return res.redirect('/portal/admin-hr');
  if (req.session.role === 'student') return res.redirect('/portal/student');
  if (req.session.role === 'faculty') return res.redirect('/portal/faculty');
  if (req.session.role === 'academics') return res.redirect('/portal/academics');
  if (req.session.role === 'utilities') return res.redirect('/portal/utilities');
  res.render('login', { message: null, targetPortal: 'admin-hr' });
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

app.get('/signup', (req, res) => res.render('signup', { message: null }));
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const exists = await q('SELECT * FROM users WHERE email=? OR username=?', [email, username]);
    if (exists.length) return res.render('signup', { message: 'Username or email already exists' });
    await q('INSERT INTO users(username,email,password) VALUES(?,?,?)', [username, email, password]);
    res.render('signup', { message: 'Account created successfully. You can now sign in.' });
  } catch (e) {
    res.render('signup', { message: 'Unable to create account: ' + e.message });
  }
});

app.get('/dashboard', auth, async (req, res) => {
  if (req.session.role === 'student') return res.redirect('/portal/student');
  if (req.session.role === 'faculty') return res.redirect('/portal/faculty');
  if (req.session.role === 'academics') return res.redirect('/portal/academics');
  if (req.session.role === 'admin-hr') return res.redirect('/portal/admin-hr');
  if (req.session.role === 'utilities') return res.redirect('/portal/utilities');

  const [students, faculty, departments, subjects] = await Promise.all([
    safeCount('student'), safeCount('faculty'), safeCount('department'), safeCount('subject')
  ]);
  const errors = [students, faculty, departments, subjects].filter(x => x.error);
  const databaseMessage = errors.length ? 'Some database data could not be loaded.' : null;
  res.render('dashboard', page('Master Admin Dashboard', {
    stats: { students: students.count, faculty: faculty.count, departments: departments.count, courses: subjects.count },
    databaseMessage,
    userRole: req.session.role || 'admin',
    studentInfo: req.session.studentInfo || null
  }));
});

const portalDefs = {
  'student': {
    title: 'Student Portal',
    subtitle: 'Learner & Academic Information Hub',
    icon: 'fa-user-graduate',
    color: '#2563eb',
    modules: [
      { name: 'Student 360° Profile', link: '/student-profile', icon: 'fa-id-card', desc: 'Complete learner dossier, academic standings, marks & fees' },
      { name: 'Course Registration', link: '/course-registration', icon: 'fa-book-open', desc: 'Semester course enrollment & subject choices' },
      { name: 'Attendance Tracker', link: '/student-attendance', icon: 'fa-calendar-check', desc: 'Subject-wise class attendance & percentage' },
      { name: 'Internal Marks', link: '/cie-marks', icon: 'fa-file-signature', desc: 'Continuous Internal Evaluation (CIE) test scores' },
      { name: 'Fee Payment', link: '/fees', icon: 'fa-wallet', desc: 'College fee payment ledger & printable receipts' }
    ]
  },
  'faculty': {
    title: 'Faculty Portal',
    subtitle: 'Instruction, Department & Academic Management',
    icon: 'fa-chalkboard-teacher',
    color: '#1d4ed8',
    modules: [
      { name: 'Faculty 360° Profile', link: '/faculty-profile', icon: 'fa-user-tie', desc: 'Faculty portfolio, teaching load, mentees & biometric logs' },
      { name: 'Attendance Marking', link: '/faculty-attendance', icon: 'fa-clipboard-check', desc: 'Faculty attendance records & biometric logs' },
      { name: 'Syllabus Coverage', link: '/subjects', icon: 'fa-layer-group', desc: 'Curriculum coverage and subject allocation' },
      { name: 'Grades & Marks Entry', link: '/see-marks', icon: 'fa-edit', desc: 'Semester End Examination (SEE) grade entry' },
      { name: 'Leave Application', link: '/leave-approval', icon: 'fa-envelope-open-text', desc: 'Submit and track faculty leave requests' }
    ]
  },
  'academics': {
    title: 'Academics & Exams',
    subtitle: 'University Curriculum, Timetables & Examinations',
    icon: 'fa-calendar-alt',
    color: '#1e40af',
    modules: [
      { name: 'Timetable Generator', link: '/timetable', icon: 'fa-calendar-week', desc: 'Automated weekly lecture schedule generator' },
      { name: 'Exam Scheduling', link: '/exam-scheduling', icon: 'fa-stopwatch', desc: 'VTU Exam schedule, dates & hall tickets' },
      { name: 'Branch & Section Management', link: '/departments', icon: 'fa-sitemap', desc: 'Engineering departments and class sections' },
      { name: 'Elective Course Allocation', link: '/elective-allocation', icon: 'fa-tasks', desc: 'Professional elective assignment & mentors' }
    ]
  },
  'admin-hr': {
    title: 'Administration & HR',
    subtitle: 'Human Resources, Admissions & Governance',
    icon: 'fa-user-cog',
    color: '#1e3a8a',
    modules: [
      { name: 'Staff Management', link: '/faculty', icon: 'fa-users-cog', desc: 'Teaching & non-teaching staff directories' },
      { name: 'Admissions Office', link: '/admissions', icon: 'fa-user-plus', desc: 'New candidate intake & admissions office' },
      { name: 'Event Notices & Alerts', link: '/notices', icon: 'fa-bullhorn', desc: 'Official circulars, notifications & alerts' },
      { name: 'Student Records', link: '/students', icon: 'fa-folder-open', desc: 'Complete USN directory and student dossiers' }
    ]
  },
  'utilities': {
    title: 'Campus Utilities',
    subtitle: 'Hostels, Digital Library, Placements & Grievances',
    icon: 'fa-tools',
    color: '#2563eb',
    modules: [
      { name: 'Library Management', link: '/library', icon: 'fa-book-reader', desc: 'Central Library, KOHA OPAC & e-resources' },
      { name: 'Hostel Allotment', link: '/hostels', icon: 'fa-bed', desc: 'Boys & Girls hostel room allotment and mess' },
      { name: 'Placement Cell / Training', link: '/placement', icon: 'fa-briefcase', desc: 'Placement recruitment drives and skill training' },
      { name: 'Feedback & Grievances', link: '/view-feedback', icon: 'fa-comment-dots', desc: 'Student feedback and grievance reports' }
    ]
  }
};

app.get('/portal/:id', auth, async(req,res) => {
  const p = portalDefs[req.params.id];
  if(!p) return res.redirect('/dashboard');

  // Enforce portal isolation: Each role can ONLY access their own dedicated portal!
  if (req.session.role === 'student' && req.params.id !== 'student') {
    return res.redirect('/portal/student?denied=1');
  }
  if (req.session.role === 'faculty' && req.params.id !== 'faculty') {
    return res.redirect('/portal/faculty?denied=1');
  }
  if (req.session.role === 'academics' && req.params.id !== 'academics') {
    return res.redirect('/portal/academics?denied=1');
  }
  if (req.session.role === 'admin-hr' && req.params.id !== 'admin-hr') {
    return res.redirect('/portal/admin-hr?denied=1');
  }
  if (req.session.role === 'utilities' && req.params.id !== 'utilities') {
    return res.redirect('/portal/utilities?denied=1');
  }
  
  if (req.params.id === 'admin-hr') {
    try {
      const [departmentsList, recentStudents, recentFaculty, notices] = await Promise.all([
        q('SELECT * FROM department ORDER BY department_name'),
        q('SELECT student.*, department.department_name FROM student LEFT JOIN department ON student.department_id=department.department_id ORDER BY student.student_id DESC LIMIT 10'),
        q('SELECT faculty.*, department.department_name FROM faculty LEFT JOIN department ON faculty.department_id=department.department_id ORDER BY faculty.faculty_id DESC LIMIT 10'),
        q('SELECT COUNT(*) as c FROM notices')
      ]);
      const [stCount, facCount] = await Promise.all([safeCount('student'), safeCount('faculty')]);
      return res.render('admin-hr-portal', page('Administration & HR Portal', {
        stats: {
          students: stCount.count,
          faculty: facCount.count,
          departments: departmentsList.length,
          notices: notices[0]?.c || 0
        },
        departmentsList,
        recentStudents,
        recentFaculty,
        message: req.query.msg || null
      }));
    } catch(err) {
      console.error('Admin portal loading error:', err.message);
    }
  }

  res.render('portal-dashboard', page(p.title, {
    portalDef: p,
    userRole: req.session.role || 'admin',
    studentInfo: req.session.studentInfo || null
  }));
});

// Dedicated Interactive Sub-Module Routes Loading Real DB Data
app.get('/course-registration', auth, async(req, res) => {
  try {
    const subjects = await q('SELECT subject.*, department.department_name FROM subject LEFT JOIN department ON subject.department_id=department.department_id');
    res.render('course-registration', page('Course Registration', { subjects }));
  } catch (err) {
    res.render('course-registration', page('Course Registration', { subjects: [] }));
  }
});

app.get('/timetable', auth, async(req, res) => {
  try {
    const timetable = await q('SELECT * FROM timetable ORDER BY semester ASC, id ASC');
    res.render('timetable', page('Timetable Generator', { timetable, message: req.query.msg || null }));
  } catch(e) {
    res.render('timetable', page('Timetable Generator', { timetable: [], message: null }));
  }
});

app.get('/exam-scheduling', auth, async(req, res) => {
  try {
    const exams = await q('SELECT * FROM exam_schedule ORDER BY id ASC');
    res.render('exam-scheduling', page('Exam Scheduling', { exams, message: req.query.msg || null }));
  } catch(e) {
    res.render('exam-scheduling', page('Exam Scheduling', { exams: [], message: null }));
  }
});

app.get('/elective-allocation', auth, async(req, res) => {
  try {
    const allocations = await q('SELECT ca.allocation_id, f.faculty_name, s.usn, s.student_name FROM counsellor_allocation ca LEFT JOIN faculty f ON ca.faculty_id=f.faculty_id LEFT JOIN student s ON ca.student_id=s.student_id');
    res.render('elective-allocation', page('Elective Course Allocation', { allocations }));
  } catch(e) {
    res.render('elective-allocation', page('Elective Course Allocation', { allocations: [] }));
  }
});

app.get('/admissions', auth, async(req, res) => {
  try {
    const [students, departmentsList] = await Promise.all([
      q('SELECT student.*, department.department_name FROM student LEFT JOIN department ON student.department_id=department.department_id ORDER BY student.student_id DESC'),
      q('SELECT * FROM department ORDER BY department_name')
    ]);
    res.render('admissions', page('Admissions Office', {
      students,
      totalStudents: students.length,
      departmentsList,
      message: req.query.msg || null
    }));
  } catch(e) {
    res.render('admissions', page('Admissions Office', { students: [], totalStudents: 0, departmentsList: [], message: null }));
  }
});

app.get('/notices', auth, async(req, res) => {
  try {
    const notices = await q('SELECT * FROM notices ORDER BY id DESC');
    res.render('notices', page('Event Notices & Alerts', { notices, message: req.query.msg || null }));
  } catch(e) {
    res.render('notices', page('Event Notices & Alerts', { notices: [], message: null }));
  }
});

app.get('/library', auth, async(req, res) => {
  try {
    const books = await q('SELECT * FROM library_books ORDER BY book_id DESC');
    res.render('library', page('Library Management', { books, message: req.query.msg || null }));
  } catch(e) {
    res.render('library', page('Library Management', { books: [], message: null }));
  }
});

app.get('/hostels', auth, async(req, res) => {
  try {
    const hostels = await q('SELECT * FROM hostel_allotment ORDER BY id ASC');
    res.render('hostels', page('Hostel Allotment', { hostels, message: req.query.msg || null }));
  } catch(e) {
    res.render('hostels', page('Hostel Allotment', { hostels: [], message: null }));
  }
});

app.get('/placement', auth, async(req, res) => {
  try {
    const drives = await q('SELECT * FROM placement_drives ORDER BY id DESC');
    res.render('placement', page('Placement Cell / Training', { drives, message: req.query.msg || null }));
  } catch(e) {
    res.render('placement', page('Placement Cell / Training', { drives: [], message: null }));
  }
});

// --- ADMIN & HR MANUAL DATA INSERTION ROUTES ---

app.post('/admin/add-student', auth, async(req, res) => {
  try {
    const { usn, student_name, gender, dob, phone, email, address, semester, department_id } = req.body;
    await pool.execute(
      'INSERT INTO student (usn, student_name, gender, dob, phone, email, address, semester, department_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [usn, student_name, gender, dob, phone, email || '', address || '', semester, department_id]
    );
    res.redirect('/portal/admin-hr?msg=Student+' + encodeURIComponent(student_name) + '+(USN:+' + encodeURIComponent(usn) + ')+successfully+added+to+database!');
  } catch(err) {
    console.error('Add student error:', err.message);
    res.redirect('/portal/admin-hr?msg=Error+saving+student:+' + encodeURIComponent(err.message));
  }
});

app.post('/admin/add-faculty', auth, async(req, res) => {
  try {
    const { faculty_name, gender, phone, email, department_id, qualification, experience } = req.body;
    await pool.execute(
      'INSERT INTO faculty (faculty_name, gender, phone, email, department_id, subject_id, qualification, experience) VALUES (?,?,?,?,?,1,?,?)',
      [faculty_name, gender, phone, email, department_id, qualification, experience]
    );
    res.redirect('/portal/admin-hr?msg=Faculty+member+' + encodeURIComponent(faculty_name) + '+saved+to+database!');
  } catch(err) {
    console.error('Add faculty error:', err.message);
    res.redirect('/portal/admin-hr?msg=Error+saving+faculty:+' + encodeURIComponent(err.message));
  }
});

app.post('/admin/add-department', auth, async(req, res) => {
  try {
    const { department_name, hod_name } = req.body;
    await pool.execute(
      'INSERT INTO department (department_name, hod_name) VALUES (?,?)',
      [department_name, hod_name]
    );
    res.redirect('/portal/admin-hr?msg=Department+' + encodeURIComponent(department_name) + '+created+in+database!');
  } catch(err) {
    console.error('Add department error:', err.message);
    res.redirect('/portal/admin-hr?msg=Error+saving+department:+' + encodeURIComponent(err.message));
  }
});

app.post('/admin/add-subject', auth, async(req, res) => {
  try {
    const { subject_code, subject_name, semester, department_id } = req.body;
    await pool.execute(
      'INSERT INTO subject (subject_code, subject_name, semester, department_id) VALUES (?,?,?,?)',
      [subject_code, subject_name, semester, department_id]
    );
    res.redirect('/portal/admin-hr?msg=Subject+' + encodeURIComponent(subject_name) + '+added+to+database!');
  } catch(err) {
    console.error('Add subject error:', err.message);
    res.redirect('/portal/admin-hr?msg=Error+saving+subject:+' + encodeURIComponent(err.message));
  }
});

app.post('/admin/add-notice', auth, async(req, res) => {
  try {
    const { title, category, description, issued_by } = req.body;
    await pool.execute(
      'INSERT INTO notices (title, category, description, issued_by) VALUES (?,?,?,?)',
      [title, category, description, issued_by]
    );
    res.redirect('/notices?msg=Notice+published+and+saved+to+database!');
  } catch(err) {
    console.error('Add notice error:', err.message);
    res.redirect('/notices?msg=Error+publishing+notice:+' + encodeURIComponent(err.message));
  }
});

app.post('/admin/add-fee', auth, async(req, res) => {
  try {
    const { usn, total_fee, paid_fee, status, invoice_no, payment_date } = req.body;
    const students = await q('SELECT student_id FROM student WHERE usn=?', [usn]);
    const student_id = students.length ? students[0].student_id : 1;
    const pending_fee = Math.max(0, Number(total_fee) - Number(paid_fee));
    await pool.execute(
      'INSERT INTO fees (student_id, total_fee, paid_fee, pending_fee, status, invoice_no, payment_date) VALUES (?,?,?,?,?,?,?)',
      [student_id, total_fee, paid_fee, pending_fee, status, invoice_no || 'INV-' + Date.now(), payment_date || new Date().toISOString().split('T')[0]]
    );
    res.redirect('/fees');
  } catch(err) {
    console.error('Add fee error:', err.message);
    res.redirect('/portal/admin-hr?msg=Error+saving+fee:+' + encodeURIComponent(err.message));
  }
});

app.post('/admin/add-attendance', auth, async(req, res) => {
  try {
    const { usn, subject_code, classes_held, classes_attended } = req.body;
    const students = await q('SELECT student_id FROM student WHERE usn=?', [usn]);
    const student_id = students.length ? students[0].student_id : 1;
    await pool.execute(
      'INSERT INTO student_attendance (student_id, subject_code, classes_held, classes_attended) VALUES (?,?,?,?)',
      [student_id, subject_code, classes_held, classes_attended]
    );
    res.redirect('/student-attendance');
  } catch(err) {
    console.error('Add attendance error:', err.message);
    res.redirect('/portal/admin-hr?msg=Error+saving+attendance:+' + encodeURIComponent(err.message));
  }
});

app.post('/admin/add-cie-mark', auth, async(req, res) => {
  try {
    const { student_name, usn, exam_type, subject_code, marks } = req.body;
    await pool.execute(
      'INSERT INTO cie_marks (student_name, usn, exam_type, subject_code, marks) VALUES (?,?,?,?,?)',
      [student_name || 'Student', usn, exam_type, subject_code, marks]
    );
    res.redirect('/cie-marks');
  } catch(err) {
    console.error('Add CIE error:', err.message);
    res.redirect('/portal/admin-hr?msg=Error+saving+marks:+' + encodeURIComponent(err.message));
  }
});

app.post('/admin/add-timetable', auth, async(req, res) => {
  try {
    const { branch, semester, section, day_of_week, time_slot, subject_name, room_no } = req.body;
    await pool.execute(
      'INSERT INTO timetable (branch, semester, section, day_of_week, time_slot, subject_name, room_no) VALUES (?,?,?,?,?,?,?)',
      [branch, semester, section, day_of_week, time_slot, subject_name, room_no || 'Room 201']
    );
    res.redirect('/timetable?msg=Lecture+slot+saved+to+database!');
  } catch(err) {
    console.error('Add timetable error:', err.message);
    res.redirect('/timetable?msg=Error:+' + encodeURIComponent(err.message));
  }
});

app.post('/admin/add-exam', auth, async(req, res) => {
  try {
    const { exam_date, session_time, subject_code, course_title, exam_center, invigilator } = req.body;
    await pool.execute(
      'INSERT INTO exam_schedule (exam_date, session_time, subject_code, course_title, exam_center, invigilator) VALUES (?,?,?,?,?,?)',
      [exam_date, session_time, subject_code, course_title, exam_center || 'Academic Block', invigilator || 'Staff Team']
    );
    res.redirect('/exam-scheduling?msg=Exam+schedule+saved+to+database!');
  } catch(err) {
    console.error('Add exam error:', err.message);
    res.redirect('/exam-scheduling?msg=Error:+' + encodeURIComponent(err.message));
  }
});

app.post('/admin/add-book', auth, async(req, res) => {
  try {
    const { acc_no, title, author, department, shelf_location, copies } = req.body;
    await pool.execute(
      'INSERT INTO library_books (acc_no, title, author, department, shelf_location, copies, status) VALUES (?,?,?,?,?,?,?)',
      [acc_no, title, author, department || 'General', shelf_location || 'Rack 1', copies || 5, 'Available']
    );
    res.redirect('/library?msg=Book+added+to+library+database!');
  } catch(err) {
    console.error('Add book error:', err.message);
    res.redirect('/library?msg=Error:+' + encodeURIComponent(err.message));
  }
});

app.post('/admin/add-hostel', auth, async(req, res) => {
  try {
    const { block_name, room_category, total_rooms, occupied, mess_fee } = req.body;
    const occ = Number(occupied) || 0;
    const tot = Number(total_rooms) || 0;
    const vac = Math.max(0, tot - occ);
    await pool.execute(
      'INSERT INTO hostel_allotment (block_name, room_category, total_rooms, occupied, vacant, mess_fee) VALUES (?,?,?,?,?,?)',
      [block_name, room_category, tot, occ, vac, mess_fee || '₹ 4,500']
    );
    res.redirect('/hostels?msg=Hostel+block+saved+to+database!');
  } catch(err) {
    console.error('Add hostel error:', err.message);
    res.redirect('/hostels?msg=Error:+' + encodeURIComponent(err.message));
  }
});

app.post('/admin/add-placement', auth, async(req, res) => {
  try {
    const { company_name, job_role, eligible_branches, package_ctc, drive_date } = req.body;
    await pool.execute(
      'INSERT INTO placement_drives (company_name, job_role, eligible_branches, package_ctc, drive_date, status) VALUES (?,?,?,?,?,?)',
      [company_name, job_role, eligible_branches, package_ctc, drive_date, 'Registration Open']
    );
    res.redirect('/placement?msg=Placement+drive+saved+to+database!');
  } catch(err) {
    console.error('Add placement error:', err.message);
    res.redirect('/placement?msg=Error:+' + encodeURIComponent(err.message));
  }
});

const listRoutes=[
 ['students','Students Details','SELECT student.*, department.department_name FROM student LEFT JOIN department ON student.department_id=department.department_id', ['student_id','usn','student_name','gender','dob','phone','email','address','semester','department_name']],
 ['departments','Departments','SELECT * FROM department', ['department_id','department_name','hod_name']],
 ['faculty','Faculty Details','SELECT faculty.*, department.department_name FROM faculty LEFT JOIN department ON faculty.department_id=department.department_id', ['faculty_id','faculty_name','gender','phone','email','department_name','qualification','experience']],
 ['courses','Courses / Subjects','SELECT subject.*, department.department_name FROM subject LEFT JOIN department ON subject.department_id=department.department_id', ['subject_id','subject_code','subject_name','semester','department_name']],
 ['subjects','Subjects','SELECT subject.*, department.department_name FROM subject LEFT JOIN department ON subject.department_id=department.department_id', ['subject_id','subject_code','subject_name','semester','department_name']],
 ['cie-marks','CIE Marks Details','SELECT * FROM cie_marks', ['cie_id','student_name','usn','exam_type','subject_code','marks']],
 ['see-marks','SEE Marks','SELECT * FROM student_see_marks', ['Mark_ID','USN','Subject_Code','SEE_Marks','Total_Marks']],
 ['results','Results','SELECT * FROM student_see_marks', ['Mark_ID','USN','Subject_Code','SEE_Marks','Total_Marks']],
 ['fees','Fees Details','SELECT fees.*,student.usn,student.student_name FROM fees LEFT JOIN student ON fees.student_id=student.student_id', ['fee_id','usn','student_name','total_fee','paid_fee','pending_fee','status','invoice_no','payment_date']],
 ['student-attendance','Student Attendance','SELECT student_attendance.*,student.usn,student.student_name FROM student_attendance LEFT JOIN student ON student_attendance.student_id=student.student_id', ['attendance_id','usn','student_name','subject_code','classes_held','classes_attended']],
 ['faculty-attendance','Faculty Attendance','SELECT faculty_attendance.*,faculty.faculty_name FROM faculty_attendance LEFT JOIN faculty ON faculty_attendance.faculty_id=faculty.faculty_id', ['attendance_id','faculty_name','total_days','present_days','absent_days','attendance_percentage']],
 ['counsellor-allocation','Counsellor Allocation','SELECT ca.allocation_id,f.faculty_name,s.usn,s.student_name FROM counsellor_allocation ca LEFT JOIN faculty f ON ca.faculty_id=f.faculty_id LEFT JOIN student s ON ca.student_id=s.student_id', ['allocation_id','faculty_name','usn','student_name']],
 ['leave-approval','Leave Approval','SELECT * FROM leave_requests ORDER BY leave_id DESC', ['leave_id','usn','student_name','leave_from','leave_to','reason','status','applied_on']]
];
for(const [route,title,sql,columns] of listRoutes){
  app.get('/'+route,auth,async(req,res)=>{
    try{
      let querySql = sql;
      let params = [];

      // Strict Student Data Isolation: Only their own records are returned
      if (req.session.role === 'student' && req.session.studentInfo) {
        const studentId = req.session.studentInfo.student_id;
        const usn = req.session.studentInfo.usn;

        if (route === 'student-attendance') {
          querySql = 'SELECT student_attendance.*,student.usn,student.student_name FROM student_attendance LEFT JOIN student ON student_attendance.student_id=student.student_id WHERE student_attendance.student_id=?';
          params = [studentId];
        } else if (route === 'cie-marks') {
          querySql = 'SELECT * FROM cie_marks WHERE usn=?';
          params = [usn];
        } else if (route === 'see-marks' || route === 'results') {
          querySql = 'SELECT * FROM student_see_marks WHERE USN=?';
          params = [usn];
        } else if (route === 'fees') {
          querySql = 'SELECT fees.*,student.usn,student.student_name FROM fees LEFT JOIN student ON fees.student_id=student.student_id WHERE fees.student_id=?';
          params = [studentId];
        } else if (route === 'leave-approval') {
          querySql = 'SELECT * FROM leave_requests WHERE student_id=? OR usn=? ORDER BY leave_id DESC';
          params = [studentId, usn];
        }
      } else if (req.session.role === 'faculty' && req.session.facultyInfo) {
        const facId = req.session.facultyInfo.faculty_id;
        if (route === 'faculty-attendance') {
          querySql = 'SELECT faculty_attendance.*,faculty.faculty_name FROM faculty_attendance LEFT JOIN faculty ON faculty_attendance.faculty_id=faculty.faculty_id WHERE faculty_attendance.faculty_id=?';
          params = [facId];
        } else if (route === 'counsellor-allocation') {
          querySql = 'SELECT ca.allocation_id,f.faculty_name,s.usn,s.student_name FROM counsellor_allocation ca LEFT JOIN faculty f ON ca.faculty_id=f.faculty_id LEFT JOIN student s ON ca.student_id=s.student_id WHERE ca.faculty_id=?';
          params = [facId];
        }
      }

      const rows = await q(querySql, params);
      res.render('table', page(title, { rows, columns, route, title, actionRoute: route }));
    } catch(e) {
      res.status(500).render('table', page(title, { rows: [], columns, error: e.message, route, title }));
    }
  });
}

async function fetchFullStudentProfile(identifier) {
  if (!identifier) return null;
  const isNumeric = !isNaN(identifier) && String(Number(identifier)) === String(identifier).trim();
  const sql = isNumeric
    ? 'SELECT student.*, department.department_name FROM student LEFT JOIN department ON student.department_id=department.department_id WHERE student.student_id=?'
    : 'SELECT student.*, department.department_name FROM student LEFT JOIN department ON student.department_id=department.department_id WHERE student.usn=?';
  const s = await q(sql, [isNumeric ? Number(identifier) : String(identifier).trim()]);
  if (!s.length) return null;
  const student = s[0];
  const usn = student.usn;
  const student_id = student.student_id;

  const [attendance, cie, see, fees, allocation, leaves, feedbacks, subjects] = await Promise.all([
    q('SELECT sa.*, sub.subject_name FROM student_attendance sa LEFT JOIN subject sub ON sa.subject_code=sub.subject_code WHERE sa.student_id=?', [student_id]),
    q('SELECT * FROM cie_marks WHERE usn=?', [usn]),
    q('SELECT ssm.Subject_Code, ssm.SEE_Marks, ssm.Total_Marks, sub.subject_name FROM student_see_marks ssm LEFT JOIN subject sub ON ssm.Subject_Code=sub.subject_code WHERE ssm.USN=?', [usn]),
    q('SELECT * FROM fees WHERE student_id=?', [student_id]),
    q('SELECT f.faculty_id, f.faculty_name, f.email, f.phone, f.qualification, f.experience, d.department_name FROM counsellor_allocation ca JOIN faculty f ON ca.faculty_id=f.faculty_id LEFT JOIN department d ON f.department_id=d.department_id WHERE ca.student_id=?', [student_id]),
    q('SELECT * FROM leave_requests WHERE student_id=? OR usn=? ORDER BY leave_id DESC', [student_id, usn]),
    q('SELECT fb.*, sub.subject_name, fac.faculty_name FROM feedback fb LEFT JOIN subject sub ON fb.subject_id=sub.subject_id LEFT JOIN faculty fac ON fb.faculty_id=fac.faculty_id WHERE fb.student_id=?', [student_id]),
    q('SELECT * FROM subject WHERE department_id=? AND semester=?', [student.department_id, student.semester])
  ]);

  return {
    student,
    attendance,
    cie,
    see,
    fees,
    allocation: allocation[0] || null,
    leaves,
    feedbacks,
    subjects
  };
}

async function fetchFullFacultyProfile(identifier) {
  if (!identifier) return null;
  const isNumeric = !isNaN(identifier) && String(Number(identifier)) === String(identifier).trim();
  const sql = isNumeric
    ? 'SELECT f.*, d.department_name, s.subject_name as primary_subject, s.subject_code as primary_subject_code FROM faculty f LEFT JOIN department d ON f.department_id=d.department_id LEFT JOIN subject s ON f.subject_id=s.subject_id WHERE f.faculty_id=?'
    : 'SELECT f.*, d.department_name, s.subject_name as primary_subject, s.subject_code as primary_subject_code FROM faculty f LEFT JOIN department d ON f.department_id=d.department_id LEFT JOIN subject s ON f.subject_id=s.subject_id WHERE f.faculty_name LIKE ? OR f.email=?';
  const f = await q(sql, [isNumeric ? Number(identifier) : `%${identifier}%`]);
  if (!f.length) return null;
  const faculty = f[0];
  const faculty_id = faculty.faculty_id;

  const [attendance, mentees, deptCourses, feedbacks, timetableSlots] = await Promise.all([
    q('SELECT * FROM faculty_attendance WHERE faculty_id=?', [faculty_id]),
    q('SELECT s.student_id, s.usn, s.student_name, s.semester, s.phone, s.email, d.department_name FROM counsellor_allocation ca JOIN student s ON ca.student_id=s.student_id LEFT JOIN department d ON s.department_id=d.department_id WHERE ca.faculty_id=? ORDER BY s.student_name ASC', [faculty_id]),
    q('SELECT s.*, d.department_name FROM subject s LEFT JOIN department d ON s.department_id=d.department_id WHERE s.department_id=?', [faculty.department_id]),
    q('SELECT fb.*, sub.subject_name, stu.student_name, stu.usn FROM feedback fb LEFT JOIN subject sub ON fb.subject_id=sub.subject_id LEFT JOIN student stu ON fb.student_id=stu.student_id WHERE fb.faculty_id=?', [faculty_id]),
    faculty.primary_subject ? q('SELECT * FROM timetable WHERE subject_name LIKE ? ORDER BY day_of_week ASC', [`%${faculty.primary_subject}%`]) : Promise.resolve([])
  ]);

  return {
    faculty,
    attendance: attendance[0] || null,
    mentees,
    deptCourses,
    feedbacks,
    timetableSlots
  };
}

app.get('/student-profile', auth, async (req, res) => {
  try {
    const isStudent = req.session.role === 'student';
    // If logged in as student, force target strictly to their own USN!
    let target = isStudent ? req.session.studentInfo.usn : (req.query.usn || req.query.id);
    const allStudents = isStudent ? [] : await q('SELECT student_id, usn, student_name, semester FROM student ORDER BY student_name ASC');
    if (!target && allStudents.length > 0) {
      target = allStudents[0].usn;
    }
    const profile = target ? await fetchFullStudentProfile(target) : null;
    res.render('student-profile', page('Student Complete Profile', {
      profile,
      allStudents,
      searchError: target && !profile ? `Student profile not found for "${target}"` : null,
      selectedUsn: profile ? profile.student.usn : (target || '')
    }));
  } catch (e) {
    res.render('student-profile', page('Student Complete Profile', { profile: null, allStudents: [], searchError: e.message, selectedUsn: '' }));
  }
});

app.get('/student-profile/:id', auth, async (req, res) => {
  try {
    const isStudent = req.session.role === 'student';
    // If logged in as student, ignore URL param and lock strictly to their own USN
    const target = isStudent ? req.session.studentInfo.usn : req.params.id;
    const allStudents = isStudent ? [] : await q('SELECT student_id, usn, student_name, semester FROM student ORDER BY student_name ASC');
    const profile = await fetchFullStudentProfile(target);
    res.render('student-profile', page('Student Complete Profile', {
      profile,
      allStudents,
      searchError: !profile ? `Student profile not found for "${target}"` : null,
      selectedUsn: profile ? profile.student.usn : target
    }));
  } catch (e) {
    res.render('student-profile', page('Student Complete Profile', { profile: null, allStudents: [], searchError: e.message, selectedUsn: '' }));
  }
});

app.post('/student-profile', auth, async (req, res) => {
  const isStudent = req.session.role === 'student';
  // If logged in as student, ignore form input and lock strictly to their own USN
  const target = isStudent ? req.session.studentInfo.usn : (req.body.usn || req.body.student_id);
  try {
    const allStudents = isStudent ? [] : await q('SELECT student_id, usn, student_name, semester FROM student ORDER BY student_name ASC');
    const profile = await fetchFullStudentProfile(target);
    res.render('student-profile', page('Student Complete Profile', {
      profile,
      allStudents,
      searchError: !profile ? `Student profile not found for "${target}"` : null,
      selectedUsn: profile ? profile.student.usn : (target || '')
    }));
  } catch (e) {
    res.render('student-profile', page('Student Complete Profile', { profile: null, allStudents: [], searchError: e.message, selectedUsn: '' }));
  }
});

app.get('/faculty-profile', auth, async (req, res) => {
  try {
    const isFaculty = req.session.role === 'faculty';
    let target = isFaculty && req.session.facultyInfo ? req.session.facultyInfo.faculty_id : (req.query.id || req.query.name);
    const allFaculty = isFaculty ? [] : await q('SELECT f.faculty_id, f.faculty_name, f.qualification, d.department_name FROM faculty f LEFT JOIN department d ON f.department_id=d.department_id ORDER BY f.faculty_name ASC');
    if (!target && allFaculty.length > 0) {
      target = allFaculty[0].faculty_id;
    }
    const profile = target ? await fetchFullFacultyProfile(target) : null;
    res.render('faculty-profile', page('Faculty Complete Profile', {
      profile,
      allFaculty,
      searchError: target && !profile ? `Faculty profile not found for "${target}"` : null,
      selectedFacultyId: profile ? profile.faculty.faculty_id : (target || '')
    }));
  } catch (e) {
    res.render('faculty-profile', page('Faculty Complete Profile', { profile: null, allFaculty: [], searchError: e.message, selectedFacultyId: '' }));
  }
});

app.get('/faculty-profile/:id', auth, async (req, res) => {
  try {
    const isFaculty = req.session.role === 'faculty';
    const target = isFaculty && req.session.facultyInfo ? req.session.facultyInfo.faculty_id : req.params.id;
    const allFaculty = isFaculty ? [] : await q('SELECT f.faculty_id, f.faculty_name, f.qualification, d.department_name FROM faculty f LEFT JOIN department d ON f.department_id=d.department_id ORDER BY f.faculty_name ASC');
    const profile = await fetchFullFacultyProfile(target);
    res.render('faculty-profile', page('Faculty Complete Profile', {
      profile,
      allFaculty,
      searchError: !profile ? `Faculty profile not found for "${target}"` : null,
      selectedFacultyId: profile ? profile.faculty.faculty_id : target
    }));
  } catch (e) {
    res.render('faculty-profile', page('Faculty Complete Profile', { profile: null, allFaculty: [], searchError: e.message, selectedFacultyId: '' }));
  }
});

app.post('/faculty-profile', auth, async (req, res) => {
  const isFaculty = req.session.role === 'faculty';
  const target = isFaculty && req.session.facultyInfo ? req.session.facultyInfo.faculty_id : (req.body.faculty_id || req.body.faculty_name);
  try {
    const allFaculty = isFaculty ? [] : await q('SELECT f.faculty_id, f.faculty_name, f.qualification, d.department_name FROM faculty f LEFT JOIN department d ON f.department_id=d.department_id ORDER BY f.faculty_name ASC');
    const profile = await fetchFullFacultyProfile(target);
    res.render('faculty-profile', page('Faculty Complete Profile', {
      profile,
      allFaculty,
      searchError: !profile ? `Faculty profile not found for "${target}"` : null,
      selectedFacultyId: profile ? profile.faculty.faculty_id : (target || '')
    }));
  } catch (e) {
    res.render('faculty-profile', page('Faculty Complete Profile', { profile: null, allFaculty: [], searchError: e.message, selectedFacultyId: '' }));
  }
});

app.get('/feedback',auth,async(req,res)=>{
  const [subjects,faculty]=await Promise.all([q('SELECT * FROM subject'),q('SELECT faculty_id,faculty_name FROM faculty')]);
  res.render('feedback',page('Subject Wise Feedback',{subjects,faculty,message:null}));
});
app.post('/feedback',auth,async(req,res)=>{
  const {usn,subject_id,faculty_id,feedback,rating}=req.body;
  const [subjects,faculty]=await Promise.all([q('SELECT * FROM subject'),q('SELECT faculty_id,faculty_name FROM faculty')]);
  try{
    const s=await q('SELECT student_id FROM student WHERE usn=?',[usn]);
    if(!s.length)return res.render('feedback',page('Subject Wise Feedback',{subjects,faculty,message:'Invalid USN'}));
    await q('INSERT INTO feedback(student_id,faculty_id,subject_id,feedback_text,rating) VALUES(?,?,?,?,?)',[s[0].student_id,faculty_id,subject_id,feedback,rating]);
    res.render('feedback',page('Subject Wise Feedback',{subjects,faculty,message:'Feedback submitted successfully'}));
  }catch(e){res.render('feedback',page('Subject Wise Feedback',{subjects,faculty,message:e.message}));}
});

app.get('/view-feedback',auth,async(req,res)=>{
  try {
    const faculty=await q('SELECT * FROM faculty');
    const rows=await q(`SELECT feedback.*,student.usn,student.student_name,subject.subject_name,faculty.faculty_name
      FROM feedback JOIN student ON feedback.student_id=student.student_id
      JOIN subject ON feedback.subject_id=subject.subject_id
      JOIN faculty ON feedback.faculty_id=faculty.faculty_id ORDER BY feedback.feedback_id DESC`);
    res.render('feedback-view',page('Faculty Wise Feedback',{rows,faculty}));
  } catch(error) {
    console.error('View feedback failed:', error.message);
    res.status(500).render('feedback-view',page('Faculty Wise Feedback',{rows:[],faculty:[],error:error.message}));
  }
});

app.get('/leave-request',auth,async(req,res)=>res.render('leave-request',page('Leave Request',{message:null})));
app.post('/leave-request',auth,async(req,res)=>{
  const {usn,student_name,leave_from,leave_to,reason}=req.body;
  try{
    const s=await q('SELECT student_id FROM student WHERE usn=?',[usn]);
    if(!s.length)return res.render('leave-request',page('Leave Request',{message:'Invalid USN'}));
    await q(`INSERT INTO leave_requests(student_id,leave_from,leave_to,reason,status,applied_on,usn,student_name)
             VALUES(?,?,?,?,?,?,?,?)`,[s[0].student_id,leave_from,leave_to,reason,'Pending',new Date(),usn,student_name]);
    res.render('leave-request',page('Leave Request',{message:'Leave request submitted successfully'}));
  }catch(e){res.render('leave-request',page('Leave Request',{message:e.message}));}
});
app.post('/leave-approval/:id/:status',auth,async(req,res)=>{
  if (req.session.role === 'student') {
    return res.status(403).send('Forbidden: Students cannot approve or reject leaves.');
  }
  try {
    const status=req.params.status==='approve'?'Approved':'Rejected';
    await q('UPDATE leave_requests SET status=? WHERE leave_id=?',[status,req.params.id]);
    res.redirect('/leave-approval');
  } catch(error) {
    console.error('Leave approval failed:', error.message);
    res.status(500).send('Unable to update leave request. Check the database connection.');
  }
});

app.get('/print-bill',auth,async(req,res)=>{
  try {
    let id=req.query.student_id;
    if (req.session.role === 'student' && req.session.studentInfo) {
      id = req.session.studentInfo.student_id;
    }
    if(!id)return res.status(400).send('Student ID Missing');
    const rows=await q('SELECT fees.*,student.usn,student.student_name FROM fees JOIN student ON fees.student_id=student.student_id WHERE fees.student_id=?',[id]);
    res.render('print-bill',page('Student Fee Bill',{bill:rows[0]||null}));
  } catch(error) {
    console.error('Print bill failed:', error.message);
    res.status(500).send('Unable to load fee bill. Check the database connection.');
  }
});

// Prevent an unexpected route/query error from killing the Node process.
app.use((err,req,res,next)=>{
  console.error('Unhandled application error:', err);
  if(res.headersSent) return next(err);
  res.status(500).send('CampusHub encountered a server error. Check the terminal for details.');
});

app.use((req,res)=>res.status(404).render('table',page('Page Not Found',{rows:[],columns:[],error:'Page not found',route:''})));

app.listen(PORT,()=>{
  const url = `http://localhost:${PORT}`;
  console.log(`CampusHub Node.js running at ${url}`);
  if (process.env.AUTO_OPEN_BROWSER !== 'false') {
    const { exec } = require('child_process');
    const startCmd = process.platform === 'darwin' ? 'open' : (process.platform === 'win32' ? 'start ""' : 'xdg-open');
    exec(`${startCmd} "${url}"`, (err) => {
      if (err) console.warn('Browser auto-launch notice:', err.message);
    });
  }
});
