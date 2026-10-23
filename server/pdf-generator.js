const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const STORAGE_DIR = path.join(__dirname, 'storage', 'certificates');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * Creates canonical payload representation for deterministic cryptographic hashing.
 */
function createCanonicalPayload(certData) {
  // Sorted keys canonical JSON representation
  const canonicalObj = {
    course_name: certData.course_name.trim(),
    grade: certData.grade.trim(),
    id: certData.id.trim(),
    institution_id: certData.institution_id.trim(),
    issue_date: certData.issue_date.trim(),
    student_id: certData.student_id.trim(),
    student_name: certData.student_name.trim()
  };
  return JSON.stringify(canonicalObj);
}

/**
 * Generates an official, beautiful verifiable PDF certificate.
 */
async function generateCertificatePDF(certData, issuerData) {
  // Create a new PDF document in Landscape (A4/Letter ratio: 792 x 612 pt)
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([792, 612]);
  const { width, height } = page.getSize();

  // Embed fonts
  const fontTimesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontTimesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontCourierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Colors
  const darkNavy = rgb(10 / 255, 25 / 255, 47 / 255);
  const deepGold = rgb(197 / 255, 160 / 255, 89 / 255);
  const subtleGray = rgb(100 / 255, 116 / 255, 139 / 255);
  const borderGold = rgb(212 / 255, 175 / 255, 55 / 255);

  // Background light tint
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(252 / 255, 252 / 255, 253 / 255)
  });

  // Outer Decorative Border
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: borderGold,
    borderWidth: 3,
    color: rgb(255 / 255, 255 / 255, 255 / 255)
  });

  // Inner Fine Border
  page.drawRectangle({
    x: 32,
    y: 32,
    width: width - 64,
    height: height - 64,
    borderColor: darkNavy,
    borderWidth: 1
  });

  // Corner Ornaments
  const drawCorner = (cx, cy) => {
    page.drawRectangle({
      x: cx - 6,
      y: cy - 6,
      width: 12,
      height: 12,
      color: borderGold
    });
  };
  drawCorner(32, 32);
  drawCorner(width - 32, 32);
  drawCorner(32, height - 32);
  drawCorner(width - 32, height - 32);

  // Generate QR Code containing verification URL and cryptographic fingerprint
  const qrData = JSON.stringify({
    verifier: "CertiCrypt Proof of Skill",
    id: certData.id,
    hash: certData.doc_hash,
    student: certData.student_name,
    verifyUrl: `http://localhost:5173/?verifyId=${encodeURIComponent(certData.id)}`
  });
  
  const qrPngBuffer = await QRCode.toBuffer(qrData, {
    width: 120,
    margin: 1,
    color: {
      dark: '#0a192f',
      light: '#ffffff'
    }
  });
  const qrImage = await pdfDoc.embedPng(qrPngBuffer);

  // Header Institution
  const instName = (issuerData.name || 'INSTITUTE OF CYBERNETICS & CRYPTOGRAPHY').toUpperCase();
  const instWidth = fontTimesBold.widthOfTextAtSize(instName, 22);
  page.drawText(instName, {
    x: (width - instWidth) / 2,
    y: height - 85,
    size: 22,
    font: fontTimesBold,
    color: darkNavy
  });

  const subHeader = 'CRYPTOGRAPHICALLY VERIFIED PROOF OF SKILL CREDENTIAL';
  const subWidth = fontTimes.widthOfTextAtSize(subHeader, 10);
  page.drawText(subHeader, {
    x: (width - subWidth) / 2,
    y: height - 105,
    size: 10,
    font: fontTimes,
    color: deepGold
  });

  // Decorative Horizontal Rule
  page.drawLine({
    start: { x: 180, y: height - 118 },
    end: { x: width - 180, y: height - 118 },
    thickness: 1,
    color: borderGold
  });

  // "This certifies that"
  const certifyText = 'This is to certify that';
  const certifyWidth = fontTimesItalic.widthOfTextAtSize(certifyText, 14);
  page.drawText(certifyText, {
    x: (width - certifyWidth) / 2,
    y: height - 150,
    size: 14,
    font: fontTimesItalic,
    color: subtleGray
  });

  // Student Name
  const studentName = certData.student_name;
  const nameWidth = fontTimesBold.widthOfTextAtSize(studentName, 30);
  page.drawText(studentName, {
    x: (width - nameWidth) / 2,
    y: height - 195,
    size: 30,
    font: fontTimesBold,
    color: darkNavy
  });

  // Student ID line
  const idLine = `Student Identifier: ${certData.student_id}`;
  const idLineWidth = fontTimes.widthOfTextAtSize(idLine, 11);
  page.drawText(idLine, {
    x: (width - idLineWidth) / 2,
    y: height - 215,
    size: 11,
    font: fontTimes,
    color: subtleGray
  });

  // "has demonstrated proficiency in"
  const skillText = 'has successfully completed all rigorous academic evaluations and demonstrated proficiency in';
  const skillWidth = fontTimes.widthOfTextAtSize(skillText, 13);
  page.drawText(skillText, {
    x: (width - skillWidth) / 2,
    y: height - 250,
    size: 13,
    font: fontTimes,
    color: rgb(30 / 255, 41 / 255, 59 / 255)
  });

  // Course / Skill Name
  const courseName = certData.course_name;
  const courseWidth = fontTimesBold.widthOfTextAtSize(courseName, 20);
  page.drawText(courseName, {
    x: (width - courseWidth) / 2,
    y: height - 285,
    size: 20,
    font: fontTimesBold,
    color: deepGold
  });

  // Grade / Honors
  const gradeText = `Performance Evaluation: ${certData.grade}`;
  const gradeWidth = fontTimesBold.widthOfTextAtSize(gradeText, 13);
  page.drawText(gradeText, {
    x: (width - gradeWidth) / 2,
    y: height - 315,
    size: 13,
    font: fontTimesBold,
    color: darkNavy
  });

  // Date and Signatures section
  const dateStr = `Date of Issuance: ${certData.issue_date}`;
  page.drawText(dateStr, {
    x: 65,
    y: height - 370,
    size: 11,
    font: fontTimes,
    color: rgb(51 / 255, 65 / 255, 85 / 255)
  });

  page.drawText(`Certificate ID: ${certData.id}`, {
    x: 65,
    y: height - 388,
    size: 11,
    font: fontCourierBold,
    color: darkNavy
  });

  // Signature line
  page.drawLine({
    start: { x: 530, y: height - 365 },
    end: { x: 720, y: height - 365 },
    thickness: 1,
    color: subtleGray
  });
  page.drawText('Registrar & Academic Dean', {
    x: 545,
    y: height - 380,
    size: 10,
    font: fontTimesItalic,
    color: subtleGray
  });
  page.drawText('Dr. Alan Turing, D.Phil (Hon)', {
    x: 540,
    y: height - 360,
    size: 12,
    font: fontTimesBold,
    color: darkNavy
  });

  // Embed QR Code
  page.drawImage(qrImage, {
    x: width / 2 - 45,
    y: height - 460,
    width: 90,
    height: 90
  });

  const scanNotice = 'Scan or Drag & Drop into Verifier Portal';
  const scanWidth = fontTimesItalic.widthOfTextAtSize(scanNotice, 9);
  page.drawText(scanNotice, {
    x: (width - scanWidth) / 2,
    y: height - 475,
    size: 9,
    font: fontTimesItalic,
    color: subtleGray
  });

  // Bottom Cryptographic Provenance Bar (Tamper-evident audit footer)
  page.drawRectangle({
    x: 45,
    y: 42,
    width: width - 90,
    height: 60,
    color: rgb(241 / 255, 245 / 255, 249 / 255),
    borderColor: rgb(203 / 255, 213 / 255, 225 / 255),
    borderWidth: 1
  });

  page.drawText('CRYPTOGRAPHIC INTEGRITY & VERIFIABILITY SPECIFICATIONS (SHA-256 / ECDSA P-256)', {
    x: 55,
    y: 88,
    size: 8,
    font: fontCourierBold,
    color: darkNavy
  });

  page.drawText(`SHA-256 HASH: ${certData.doc_hash}`, {
    x: 55,
    y: 74,
    size: 7.5,
    font: fontCourier,
    color: rgb(15 / 255, 23 / 255, 42 / 255)
  });

  const sigPreview = certData.signature ? certData.signature.substring(0, 48) + '...' : 'ECDSA-SECP256R1';
  page.drawText(`DIGITAL SIGNATURE (ECDSA): ${sigPreview}   |   KEY FINGERPRINT: ${issuerData.fingerprint || 'N/A'}`, {
    x: 55,
    y: 61,
    size: 7.5,
    font: fontCourier,
    color: subtleGray
  });

  page.drawText(`STATUS: IMMUTABLE AUDIT TRAIL   |   MERKLE ROOT: ${certData.merkle_root ? certData.merkle_root.substring(0, 32) + '...' : 'GENESIS'}`, {
    x: 55,
    y: 49,
    size: 7.5,
    font: fontCourier,
    color: subtleGray
  });

  // Set PDF Metadata properties
  pdfDoc.setTitle(`Proof of Skill - ${certData.student_name} - ${certData.id}`);
  pdfDoc.setAuthor(issuerData.name);
  pdfDoc.setSubject(certData.doc_hash);
  pdfDoc.setKeywords([
    'CertiCrypt',
    'CryptographicProof',
    `ID:${certData.id}`,
    `HASH:${certData.doc_hash}`,
    `PAYLOAD:${createCanonicalPayload(certData)}`
  ]);

  const pdfBytes = await pdfDoc.save();
  const filename = `${certData.id}.pdf`;
  const filePath = path.join(STORAGE_DIR, filename);
  fs.writeFileSync(filePath, pdfBytes);

  return {
    filename,
    filePath,
    pdfBytes: Buffer.from(pdfBytes)
  };
}

module.exports = {
  createCanonicalPayload,
  generateCertificatePDF,
  STORAGE_DIR
};
