import nodemailer from 'nodemailer';

export class EmailService {
  static async sendReportSummary(to: string, subject: string, htmlContent: string) {
    try {
      // Create transporter using Gmail SMTP
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Verify transporter configuration
      await transporter.verify();

      // Send email
      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html: htmlContent
      });

      console.log('Email sent successfully:', info.messageId);

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error: any) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async sendDailyReport(to: string, reportData: any, analysis: any = null) {
    // Create HTML content for the daily report
    const { date, farmDetails, farmProduction } = reportData;

    let analysisHtml = '';
    if (analysis) {
      analysisHtml = `
        <div class="section financial-summary" style="background-color: #e8f5e9; border: 1px solid #c8e6c9;">
          <h2>Weekly Analysis (Last 7 Days)</h2>
          <p>Total Milk Production: ${analysis.weeklyMilk.toFixed(1)} Liters</p>
          <p>Net Cash Flow: PKR ${analysis.weeklyCashFlow.toFixed(2)}</p>
          <p><em>Based on last ${analysis.daysAnalyzed} entries</em></p>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .header { background-color: #f0f0f0; padding: 20px; text-align: center; }
          .section { margin: 20px 0; }
          .production-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .production-item { padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
          .financial-summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Daily Farm Report</h1>
          <p>${farmDetails.farmName} - ${date}</p>
        </div>
        
        ${analysisHtml}
        
        <div class="section">
          <h2>Farm Production Summary</h2>
          <div class="production-grid">
            <div class="production-item">
              <h3>Cow Milk</h3>
              <p>Morning: ${farmProduction?.cow_morning_total || 0} liters</p>
              <p>Evening: ${farmProduction?.cow_evening_total || 0} liters</p>
              <p><strong>Total: ${(farmProduction?.cow_morning_total || 0) + (farmProduction?.cow_evening_total || 0)} liters</strong></p>
            </div>
            <div class="production-item">
              <h3>Buffalo Milk</h3>
              <p>Morning: ${farmProduction?.buffalo_morning_total || 0} liters</p>
              <p>Evening: ${farmProduction?.buffalo_evening_total || 0} liters</p>
              <p><strong>Total: ${(farmProduction?.buffalo_morning_total || 0) + (farmProduction?.buffalo_evening_total || 0)} liters</strong></p>
            </div>
          </div>
        </div>
        
        <div class="section financial-summary">
          <h2>Financial Summary</h2>
          <p>Cash In: PKR ${farmProduction?.cashIn || 0}</p>
          <p>Cash Out: PKR ${farmProduction?.cashOut || 0}</p>
          <p>Total Expenses: PKR ${farmProduction?.totalExpense || 0}</p>
          <p><strong>Net Cash Flow: PKR ${(farmProduction?.cashIn || 0) - (farmProduction?.cashOut || 0)}</strong></p>
        </div>
      </body>
      </html>
    `;

    return this.sendReportSummary(
      to,
      `Daily Report - ${farmDetails.farmName} (${date})`,
      htmlContent
    );
  }
}