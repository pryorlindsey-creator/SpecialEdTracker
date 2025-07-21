import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface PDFStudentData {
  id: number;
  name: string;
  grade: string;
  iepDueDate: string | null;
  relatedServices: string;
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalDataPoints: number;
}

export interface PDFGoalData {
  id: number;
  title: string;
  description: string;
  targetCriteria: string;
  dataCollectionType: string;
  status: string;
  currentProgress: number;
  dataPointsCount: number;
  lastDataDate: string | null;
}

export interface PDFDataPoint {
  id: number;
  date: string;
  goalTitle: string;
  progressValue: string;
  progressFormat: string;
  levelOfSupport: string;
  anecdotalInfo: string;
  createdAt: string;
}

export class PDFGenerator {
  private doc: jsPDF;

  constructor() {
    this.doc = new jsPDF();
    console.log('PDF instance created successfully');
  }

  async generateChartsReport(
    student: PDFStudentData,
    goals: PDFGoalData[]
  ): Promise<void> {
    try {
      console.log('Setting up charts PDF document...');
      // Set up document
      this.setupDocument();
      
      console.log('Adding header...');
      // Add header
      this.addHeader(student);
      
      console.log('Capturing chart images...');
      // Capture charts from the Reports tab
      await this.addChartsWithImages(student, goals);
      
      console.log('Downloading charts PDF...');
      // Download
      this.doc.save(`${student.name}_Progress_Charts_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      console.log('Charts PDF generation completed successfully');
    } catch (error) {
      console.error('Error in charts PDF generation:', error);
      throw error;
    }
  }

  generateStudentReport(
    student: PDFStudentData,
    goals: PDFGoalData[],
    dataPoints: PDFDataPoint[]
  ): void {
    try {
      console.log('Setting up PDF document...');
      // Set up document
      this.setupDocument();
      
      console.log('Adding header...');
      // Add header
      this.addHeader(student);
      
      console.log('Adding student info...');
      // Add student information
      this.addStudentInfo(student);
      
      console.log('Adding goals summary...');
      // Add goals summary
      this.addGoalsSummary(goals);
      
      console.log('Adding goals details...');
      // Add goals details
      this.addGoalsDetails(goals);
      
      console.log('Adding new page for raw data...');
      // Start new page for raw data
      this.doc.addPage();
      
      console.log('Adding raw data table...');
      this.addRawDataTable(dataPoints);
      
      console.log('Downloading PDF...');
      // Download the PDF
      this.downloadPDF(student.name);
    } catch (error) {
      console.error('Error in PDF generation:', error);
      throw error;
    }
  }

  private setupDocument(): void {
    this.doc.setProperties({
      title: 'Student IEP Progress Report',
      subject: 'Special Education Data Collection Report',
      author: 'Special Education Data Collection App',
      creator: 'Special Education Data Collection App'
    });
  }

  private addHeader(student: PDFStudentData): void {
    // Title
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('IEP Progress Report', 105, 20, { align: 'center' });
    
    // Student name
    this.doc.setFontSize(16);
    this.doc.text(`Student: ${student.name}`, 105, 30, { align: 'center' });
    
    // Report date
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Report Generated: ${format(new Date(), 'MMMM dd, yyyy')}`, 105, 40, { align: 'center' });
    
    // Horizontal line
    this.doc.setLineWidth(0.5);
    this.doc.line(20, 45, 190, 45);
  }

  private addStudentInfo(student: PDFStudentData): void {
    let yPos = 55;
    
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Student Information', 20, yPos);
    
    yPos += 10;
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    
    // Student details
    const studentInfo = [
      ['Grade Level:', student.grade || 'Not specified'],
      ['IEP Due Date:', student.iepDueDate ? format(new Date(student.iepDueDate), 'MMMM dd, yyyy') : 'Not set'],
      ['Related Services:', student.relatedServices || 'None specified'],
      ['Total Goals:', student.totalGoals.toString()],
      ['Active Goals:', student.activeGoals.toString()],
      ['Completed Goals:', student.completedGoals.toString()],
      ['Total Data Points:', student.totalDataPoints.toString()]
    ];

    studentInfo.forEach(([label, value]) => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(label, 25, yPos);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(value, 70, yPos);
      yPos += 8;
    });
  }

  private addGoalsSummary(goals: PDFGoalData[]): void {
    const yPos = 130;
    
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Goals Summary', 20, yPos);
    
    // Goals summary table
    const tableData = goals.map(goal => [
      goal.title,
      goal.dataCollectionType,
      goal.status,
      `${Math.round(goal.currentProgress)}%`,
      goal.dataPointsCount.toString(),
      goal.lastDataDate ? format(new Date(goal.lastDataDate), 'MM/dd/yyyy') : 'No data'
    ]);

    autoTable(this.doc, {
      startY: yPos + 10,
      head: [['Goal Title', 'Data Type', 'Status', 'Progress', 'Data Points', 'Last Entry']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 25 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 }
      }
    });
  }

  private addGoalsDetails(goals: PDFGoalData[]): void {
    let yPos = (this.doc as any).lastAutoTable?.finalY + 20 || 200;
    
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Goal Details', 20, yPos);
    
    yPos += 10;
    
    goals.forEach((goal, index) => {
      // Check if we need a new page
      if (yPos > 250) {
        this.doc.addPage();
        yPos = 20;
      }
      
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`${index + 1}. ${goal.title}`, 25, yPos);
      
      yPos += 8;
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      
      // Goal description (wrap text)
      const descriptionLines = this.doc.splitTextToSize(`Description: ${goal.description}`, 160);
      this.doc.text(descriptionLines, 30, yPos);
      yPos += descriptionLines.length * 5;
      
      // Target criteria (wrap text)
      const criteriaLines = this.doc.splitTextToSize(`Target Criteria: ${goal.targetCriteria}`, 160);
      this.doc.text(criteriaLines, 30, yPos);
      yPos += criteriaLines.length * 5;
      
      // Goal stats
      this.doc.text(`Data Collection Type: ${goal.dataCollectionType}`, 30, yPos);
      yPos += 5;
      this.doc.text(`Current Progress: ${Math.round(goal.currentProgress)}%`, 30, yPos);
      yPos += 5;
      this.doc.text(`Data Points Collected: ${goal.dataPointsCount}`, 30, yPos);
      yPos += 15; // Extra space between goals
    });
  }

  private async addChartsWithImages(student: PDFStudentData, goals: PDFGoalData[]): Promise<void> {
    let yPos = 40;
    
    // Look for charts in multiple possible locations
    const chartSelectors = [
      `[data-goal-id]`, // Any chart with goal ID
      `.recharts-wrapper`, // Recharts containers
      `[class*="chart"]`, // Any element with "chart" in class name
      `svg[class*="recharts"]` // SVG elements from recharts
    ];
    
    let chartsFound = 0;
    
    // Try to capture individual goal charts from the Reports tab
    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      let chartCaptured = false;
      
      try {
        // Look for the chart element by goal ID first
        let chartElement = document.querySelector(`[data-goal-id="${goal.id}"]`) as HTMLElement;
        
        console.log(`Looking for chart with data-goal-id="${goal.id}", found:`, !!chartElement);
        
        // If not found, try alternative selectors
        if (!chartElement) {
          // Try to find charts by card structure with goal titles
          const goalCards = Array.from(document.querySelectorAll('.card, [class*="card"]')).filter((card: any) => {
            const cardText = card.textContent || '';
            return cardText.includes(goal.title);
          });
          
          if (goalCards.length > 0) {
            chartElement = goalCards[0] as HTMLElement;
            console.log(`Found chart by goal title: ${goal.title}`);
          }
        }
        
        if (chartElement && chartElement.offsetHeight > 0 && chartElement.offsetWidth > 0) {
          console.log(`Capturing chart for goal: ${goal.title}`);
          
          // Add goal header
          if (yPos > 200) {
            this.doc.addPage();
            yPos = 20;
          }
          
          this.doc.setFontSize(14);
          this.doc.setFont('helvetica', 'bold');
          this.doc.text(`${i + 1}. ${goal.title}`, 20, yPos);
          
          yPos += 10;
          this.doc.setFontSize(10);
          this.doc.setFont('helvetica', 'normal');
          
          // Goal description
          if (goal.description) {
            const descLines = this.doc.splitTextToSize(`Description: ${goal.description}`, 170);
            this.doc.text(descLines, 20, yPos);
            yPos += descLines.length * 5 + 3;
          }
          
          // Target criteria
          if (goal.targetCriteria) {
            const criteriaLines = this.doc.splitTextToSize(`Target: ${goal.targetCriteria}`, 170);
            this.doc.text(criteriaLines, 20, yPos);
            yPos += criteriaLines.length * 5 + 3;
          }
          
          yPos += 5;
          
          // Capture the chart as image
          const canvas = await html2canvas(chartElement, {
            backgroundColor: '#ffffff',
            scale: 1.5,
            useCORS: true,
            allowTaint: true,
            height: chartElement.offsetHeight,
            width: chartElement.offsetWidth
          });
          
          const imgData = canvas.toDataURL('image/png');
          
          // Calculate dimensions to fit on page
          const imgWidth = 170; // Max width for PDF
          const imgHeight = (canvas.height / canvas.width) * imgWidth;
          
          // Check if we need a new page
          if (yPos + imgHeight > 280) {
            this.doc.addPage();
            yPos = 20;
          }
          
          // Add image to PDF
          this.doc.addImage(imgData, 'PNG', 20, yPos, imgWidth, imgHeight);
          yPos += imgHeight + 20;
          
          chartCaptured = true;
          chartsFound++;
        }
        
        if (!chartCaptured) {
          console.log(`No chart element found for goal: ${goal.title}`);
          // Add detailed goal information instead
          if (yPos > 220) {
            this.doc.addPage();
            yPos = 20;
          }
          
          this.doc.setFontSize(14);
          this.doc.setFont('helvetica', 'bold');
          this.doc.text(`${i + 1}. ${goal.title}`, 20, yPos);
          
          yPos += 10;
          this.doc.setFontSize(10);
          this.doc.setFont('helvetica', 'normal');
          
          // Goal description
          if (goal.description) {
            const descLines = this.doc.splitTextToSize(`Description: ${goal.description}`, 170);
            this.doc.text(descLines, 20, yPos);
            yPos += descLines.length * 5 + 3;
          }
          
          // Target criteria
          if (goal.targetCriteria) {
            const criteriaLines = this.doc.splitTextToSize(`Target: ${goal.targetCriteria}`, 170);
            this.doc.text(criteriaLines, 20, yPos);
            yPos += criteriaLines.length * 5 + 3;
          }
          
          yPos += 5;
          
          // Instructions
          this.doc.setFontSize(9);
          this.doc.setFont('helvetica', 'italic');
          this.doc.text('To view visual chart: Go to Reports tab in the application and click Print Charts while viewing charts.', 20, yPos);
          yPos += 15;
        }
      } catch (error) {
        console.error(`Error capturing chart for goal ${goal.title}:`, error);
        // Continue with next chart
      }
    }
    
    // Add summary at the end
    if (yPos > 250) {
      this.doc.addPage();
      yPos = 20;
    }
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Chart Capture Summary', 20, yPos);
    yPos += 10;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Charts successfully captured: ${chartsFound} of ${goals.length}`, 20, yPos);
    yPos += 8;
    
    if (chartsFound === 0) {
      this.doc.text('No visual charts were captured. To include charts in PDF:', 20, yPos);
      yPos += 6;
      this.doc.text('1. Navigate to the Reports tab', 25, yPos);
      yPos += 5;
      this.doc.text('2. Wait for all charts to load completely', 25, yPos);
      yPos += 5;
      this.doc.text('3. Click Print Charts button while charts are visible', 25, yPos);
    }
  }

  private addChartsSection(student: PDFStudentData, goals: PDFGoalData[]): void {
    let yPos = 60;
    
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Progress Charts', 20, yPos);
    
    yPos += 15;
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('This report contains visual progress charts for each goal.', 20, yPos);
    
    yPos += 10;
    this.doc.text('Charts show data points over time with trend analysis.', 20, yPos);
    
    yPos += 20;
    
    // Add goals summary for charts
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Goals Overview', 20, yPos);
    
    // Goals summary table for charts context
    const tableData = goals.map(goal => [
      goal.title,
      goal.dataCollectionType,
      `${Math.round(goal.currentProgress)}%`,
      goal.dataPointsCount.toString()
    ]);

    autoTable(this.doc, {
      startY: yPos + 10,
      head: [['Goal Title', 'Data Type', 'Current Progress', 'Data Points']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 }
      }
    });
    
    // Add note about charts
    const finalY = (this.doc as any).lastAutoTable?.finalY + 20 || yPos + 80;
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Chart Instructions:', 20, finalY);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('• View interactive charts in the application\'s Reports tab', 25, finalY + 12);
    this.doc.text('• Each goal displays as a separate scatter plot with trend lines', 25, finalY + 20);
    this.doc.text('• Charts show progress over time with date labels on x-axis', 25, finalY + 28);
    this.doc.text('• Different data types (percentage, frequency, duration) use appropriate scales', 25, finalY + 36);
    this.doc.text('• This printable summary provides context for chart interpretation', 25, finalY + 44);
  }

  private addRawDataTable(dataPoints: PDFDataPoint[]): void {
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Raw Data Points', 20, 20);
    
    // Format data for table
    const tableData = dataPoints.map(point => [
      format(new Date(point.date), 'MM/dd/yyyy'),
      point.goalTitle,
      this.formatProgressValue(point.progressValue, point.progressFormat),
      this.formatLevelOfSupport(point.levelOfSupport),
      point.anecdotalInfo || '—',
      format(new Date(point.createdAt), 'MM/dd/yyyy HH:mm')
    ]);

    autoTable(this.doc, {
      startY: 30,
      head: [['Date', 'Goal', 'Progress', 'Support Level', 'Notes', 'Recorded']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 40 },
        5: { cellWidth: 30 }
      }
    });
  }

  private formatProgressValue(value: string, format: string): string {
    const numValue = parseFloat(value);
    
    switch (format) {
      case 'percentage':
        return `${Math.round(numValue)}%`;
      case 'frequency':
        return `${numValue} times`;
      case 'duration':
        const minutes = Math.floor(numValue);
        const seconds = Math.round((numValue - minutes) * 100);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      default:
        return value;
    }
  }

  private formatLevelOfSupport(levelOfSupport: string): string {
    try {
      const parsed = JSON.parse(levelOfSupport);
      if (Array.isArray(parsed)) {
        return parsed.map(level => level.replace(/-/g, ' ')).join(', ');
      }
      return levelOfSupport;
    } catch {
      return levelOfSupport || 'None';
    }
  }

  private downloadPDF(studentName: string): void {
    const fileName = `${studentName.replace(/\s+/g, '_')}_IEP_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    this.doc.save(fileName);
  }
}