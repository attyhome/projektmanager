import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
// Fix: Import Buffer explicitly to resolve compilation errors in environments where it's not globally defined
import { Buffer } from 'buffer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const storagePath = process.env.STORAGE_PATH || path.join(__dirname, 'uploads');

// Fix: Cast express.json middleware to any to resolve type conflicts on line 19/20 where NextHandleFunction is not recognized by some Express overloads
app.use(express.json({ limit: '50mb' }) as any);

// Kereszt-eredet engedélyezése (CORS)
// Fix: Added explicit 'any' types and cast middleware function to any to resolve type mismatch with Express's internal 'PathParams' or 'RequestHandler' expectations.
app.use(((req: any, res: any, next: any) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}) as any);

// Feltöltési mappa létrehozása, ha nem létezik
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
}

// Multer konfiguráció
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storagePath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Fix: Cast express.static result to 'any' to resolve type compatibility issues with app.use when a path is specified (Error line 50).
app.use('/files', express.static(storagePath) as any);

// PDF Export Endpoint
app.post('/api/export-pdf', (req, res) => {
  const { project, tasks, materials, costs, total } = req.body;

  if (!project) {
    return res.status(400).json({ error: 'Nincs projekt adat' });
  }

  const doc = new jsPDF() as any;
  
  // Stílus beállítások
  const primaryColor = [79, 70, 229]; // Indigo-600

  // Fejléc
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJEKT ADATLAP', 15, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generálva: ${new Date().toLocaleString('hu-HU')}`, 15, 30);
  doc.text('ProjektMester MVP Management System', 140, 30);

  // Projekt Alapadatok
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Projekt Informaciok', 15, 55);
  doc.setLineWidth(0.5);
  doc.line(15, 57, 195, 57);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nev: ${project.name}`, 15, 65);
  doc.text(`Statusz: ${project.status}`, 15, 72);
  doc.text(`Helyszin: ${project.location || '-'}`, 15, 79);
  doc.text(`Kezdes: ${project.start_date || '-'}`, 110, 65);
  doc.text(`Hatarido: ${project.end_date || '-'}`, 110, 72);

  // Ügyfél adatok
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ugyfel Adatok', 15, 95);
  doc.line(15, 97, 195, 97);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nev: ${project.customer_name || '-'}`, 15, 105);
  doc.text(`Email: ${project.customer_email || '-'}`, 15, 112);
  doc.text(`Telefon: ${project.customer_phone || '-'}`, 110, 105);

  // Projekt Leírás (ÚJ)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Projekt Leiras', 15, 125);
  doc.line(15, 127, 195, 127);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const splitDescription = doc.splitTextToSize(project.description || '-', 180);
  doc.text(splitDescription, 15, 135);

  const descHeight = splitDescription.length * 5;
  const tasksStartY = 140 + descHeight;

  // Feladatok táblázat
  doc.autoTable({
    startY: tasksStartY,
    head: [['Feladat', 'Statusz', 'Felelos']],
    body: tasks.map((t: any) => [t.title, t.status, t.created_by]),
    theme: 'striped',
    headStyles: { fillColor: primaryColor },
    margin: { left: 15, right: 15 }
  });

  // Anyagok táblázat
  doc.autoTable({
    startY: (doc as any).lastAutoTable.finalY + 15,
    head: [['Anyag megnevezese', 'Mennyiseg', 'Egysegar', 'Osszesen']],
    body: materials.map((m: any) => [
      m.name, 
      `${m.quantity} ${m.unit}`, 
      `${m.unit_price} Ft`, 
      `${m.quantity * m.unit_price} Ft`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85] },
    margin: { left: 15, right: 15 }
  });

  // Költségek táblázat
  doc.autoTable({
    startY: (doc as any).lastAutoTable.finalY + 15,
    head: [['Koltseg megnevezese', 'Tipus', 'Osszeg']],
    body: costs.map((c: any) => [c.description, c.type, `${c.amount} Ft`]),
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85] },
    margin: { left: 15, right: 15 }
  });

  // Összesítés
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJEKT MINDOSSZESEN:', 15, finalY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${total.toLocaleString('hu-HU')} Ft`, 120, finalY);

  const pdfOutput = doc.output('arraybuffer');
  res.contentType('application/pdf');
  // Fix: Use imported Buffer class to send binary PDF data
  res.send(Buffer.from(pdfOutput));
});

// Fix: Added explicit 'any' casts to multer middleware and route handler to bypass type conflicts between multer and express types (Error line 167).
app.post('/api/upload', upload.array('files') as any, (req: any, res: any) => {
  const files = (req.files as any[]) || [];
  const fileData = files.map(file => ({
    filename: file.originalname,
    file_path: `/files/${file.filename}`,
    file_type: file.mimetype,
    size: file.size,
    created_at: new Date().toISOString()
  }));
  res.json({ success: true, files: fileData });
});

app.delete('/api/files/:filename', (req, res) => {
  const filePath = path.join(storagePath, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Fájl nem található' });
  }
});

// Fix: Cast express.static result to 'any' to resolve type compatibility issues with app.use (Error line 189).
app.use(express.static(path.join(__dirname, 'dist')) as any);
app.get('*', (req: any, res: any) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Szerver fut: http://localhost:${port}`);
});