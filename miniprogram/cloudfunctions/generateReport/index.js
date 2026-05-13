/**
 * 云函数：生成健康报告PDF
 * 
 * 依赖：pdfkit
 * 部署前请在云函数目录执行：npm install
 * 
 * 输入：
 *   nickname - 用户昵称
 *   date - 生成日期
 *   period - 报告周期
 *   reportData - 报告统计数据
 *   records - 病程记录数组
 *   checkIns - 打卡记录数组
 * 
 * 输出：
 *   fileID - 云存储文件ID
 *   error - 错误信息
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const PDFDocument = require('pdfkit');

exports.main = async (event, context) => {
  const { nickname, date, period, reportData, records, checkIns } = event;

  try {
    // 创建PDF文档
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      info: {
        Title: `银屑助手健康报告 - ${nickname}`,
        Author: '银屑助手',
        Subject: '银屑病健康管理报告',
        Keywords: '银屑病, 健康报告, 病程管理'
      }
    });

    // 收集PDF数据块
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    // 等待PDF生成完毕
    const pdfBuffer = await new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ===== 开始绘制PDF内容 =====

      // 颜色定义
      const primaryColor = '#2E7D5B';
      const purpleColor = '#B39DDB';
      const textColor = '#1A1A2E';
      const secondaryColor = '#666680';
      const lightColor = '#9999AA';
      const borderColor = '#EEEEF0';

      // 页眉
      doc.fontSize(24).font('Helvetica-Bold').fillColor(primaryColor)
         .text('银屑助手', { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor(secondaryColor)
         .text('健康管理报告', { align: 'center' });
      doc.moveDown(0.5);

      // 分隔线
      doc.moveTo(40, doc.y).lineTo(550, doc.y)
         .strokeColor(borderColor).lineWidth(1).stroke();
      doc.moveDown(0.5);

      // 用户信息
      doc.fontSize(11).font('Helvetica').fillColor(textColor)
         .text(`用户：${nickname}`);
      doc.fontSize(10).fillColor(secondaryColor)
         .text(`生成日期：${date}`);
      doc.fontSize(10).fillColor(secondaryColor)
         .text(`报告周期：${period}`);
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(550, doc.y)
         .strokeColor(borderColor).lineWidth(0.5).stroke();
      doc.moveDown(1);

      // ===== 1. 总览 =====
      doc.fontSize(16).font('Helvetica-Bold').fillColor(primaryColor)
         .text('📋 报告总览');
      doc.moveDown(0.3);

      const overviewItems = [
        { label: '记录天数', value: `${reportData.totalDays || 0} 天` },
        { label: '平均抗炎指数', value: `${reportData.averageScore || 0}` },
        { label: '润肤打卡率', value: `${reportData.checkInRate || 0}%` },
        { label: '饮食合规率', value: `${reportData.dietRate || 0}%` }
      ];

      // 绘制概览表格
      const startY = doc.y;
      const colWidth = 120;
      const rowHeight = 24;

      overviewItems.forEach((item, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = 40 + col * (colWidth + 20);
        const y = startY + row * rowHeight;

        doc.rect(x, y, colWidth, rowHeight).fillColor('#F5F7FA').fill();
        doc.fontSize(11).font('Helvetica').fillColor(secondaryColor)
           .text(item.label, x + 8, y + 4, { width: 70 });
        doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor)
           .text(item.value, x + 80, y + 4, { width: 50, align: 'right' });
      });

      doc.y = startY + rowHeight * 2 + 10;
      doc.moveDown(1);

      // ===== 2. 瘙痒趋势 =====
      doc.fontSize(16).font('Helvetica-Bold').fillColor(primaryColor)
         .text('😊 瘙痒趋势');
      doc.moveDown(0.3);

      let itchDesc = '➡️ 瘙痒程度保持稳定';
      if (reportData.itchTrend === 'improving') itchDesc = '📈 瘙痒程度呈改善趋势';
      else if (reportData.itchTrend === 'worsening') itchDesc = '📉 瘙痒程度有所加重';

      doc.fontSize(11).font('Helvetica').fillColor(textColor).text(itchDesc);
      doc.moveDown(0.5);

      // 绘制瘙痒趋势图（简单条形图）
      if (reportData.itchChartData && reportData.itchChartData.length > 0) {
        const chartX = 50;
        const chartY = doc.y;
        const chartWidth = 500;
        const chartHeight = 80;
        const barCount = reportData.itchChartData.length;
        const barWidth = Math.min(18, (chartWidth - 20) / barCount);

        doc.fontSize(8).fillColor(secondaryColor);
        for (let i = 0; i <= 4; i++) {
          const y = chartY + (chartHeight - 10) - (i / 4 * (chartHeight - 20));
          doc.text(String(i), 36, y - 4);
          doc.moveTo(44, y).lineTo(chartX + chartWidth, y)
             .strokeColor(borderColor).lineWidth(0.3).stroke();
        }

        reportData.itchChartData.forEach((item, i) => {
          const barH = (5 - item.value) / 5 * (chartHeight - 20);
          const x = chartX + 10 + i * (barWidth + 4);
          const y = chartY + (chartHeight - 10) - barH;

          doc.rect(x, y, barWidth, barH)
             .fillColor(primaryColor).fill();

          if (i % 2 === 0) {
            doc.fontSize(6).fillColor(lightColor)
               .text(item.shortDate || '', x, chartY + chartHeight - 5, { width: barWidth + 8, align: 'center' });
          }
        });

        doc.y = chartY + chartHeight + 10;
      }
      doc.moveDown(1);

      // ===== 3. 皮损面积变化 =====
      doc.fontSize(16).font('Helvetica-Bold').fillColor(primaryColor)
         .text('📋 皮损面积变化');
      doc.moveDown(0.3);

      doc.fontSize(11).font('Helvetica').fillColor(textColor)
         .text(`好转 ${reportData.improveDays || 0} 天  |  稳定 ${reportData.stableDays || 0} 天  |  加重 ${reportData.worsenDays || 0} 天`);
      doc.moveDown(1);

      // ===== 4. 饮食执行情况 =====
      doc.fontSize(16).font('Helvetica-Bold').fillColor(primaryColor)
         .text('🍽️ 饮食执行情况');
      doc.moveDown(0.3);

      const dietRate = reportData.dietRate || 0;
      const barY = doc.y;
      doc.rect(40, barY, 510, 14).fillColor('#F5F7FA').fill();
      doc.rect(40, barY, 510 * dietRate / 100, 14).fillColor(primaryColor).fill();
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#FFFFFF')
         .text(`${dietRate}%`, 45, barY + 1);
      
      doc.y = barY + 24;
      doc.fontSize(10).font('Helvetica').fillColor(secondaryColor)
         .text(`饮食合规率：${dietRate}%`);
      doc.moveDown(1);

      // ===== 5. 心情趋势 =====
      doc.fontSize(16).font('Helvetica-Bold').fillColor(purpleColor)
         .text('😌 心情趋势');
      doc.moveDown(0.3);

      let moodDesc = '⛅ 心情整体平稳';
      if (reportData.moodTrend === 'improving') moodDesc = '🌈 整体心情在变好';
      else if (reportData.moodTrend === 'worsening') moodDesc = '🌧️ 近期情绪波动较大';

      doc.fontSize(11).font('Helvetica').fillColor(textColor).text(moodDesc);
      doc.moveDown(0.5);

      // 心情条形图
      if (reportData.moodChartData && reportData.moodChartData.length > 0) {
        const mChartX = 50;
        const mChartY = doc.y;
        const mChartWidth = 500;
        const mChartHeight = 60;
        const mBarCount = reportData.moodChartData.length;
        const mBarWidth = Math.min(28, (mChartWidth - 20) / mBarCount);

        reportData.moodChartData.forEach((item, i) => {
          const barH = (item.value + 1) / 5 * (mChartHeight - 10);
          const x = mChartX + 10 + i * (mBarWidth + 4);
          const y = mChartY + mChartHeight - barH;

          doc.rect(x, y, mBarWidth, barH)
             .fillColor(purpleColor).fill();

          doc.fontSize(10).fillColor(textColor)
             .text(item.emoji || '😐', x + 4, y - 12);
        });

        doc.y = mChartY + mChartHeight + 10;
      }
      doc.moveDown(1);

      // ===== 6. 感染预警 =====
      if (reportData.infectionDays && reportData.infectionDays > 0) {
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#C62828')
           .text('⚠️ 感染预警');
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica').fillColor('#C62828')
           .text(`报告期内有 ${reportData.infectionDays} 天记录了咽痛/感冒症状。`);
        doc.fontSize(10).fillColor(secondaryColor)
           .text('感染是银屑病加重的重要诱因，请注意休息和防护。');
        doc.moveDown(1);
      }

      // ===== 7. 润肤打卡 =====
      doc.fontSize(16).font('Helvetica-Bold').fillColor(primaryColor)
         .text('🧴 润肤打卡情况');
      doc.moveDown(0.3);

      doc.fontSize(11).font('Helvetica').fillColor(textColor)
         .text(`打卡天数：${reportData.checkInDays || 0} 天`);
      doc.fontSize(10).fillColor(secondaryColor)
         .text(`连续打卡：${reportData.continuousCheckInDays || 0} 天`);
      doc.fontSize(10).fillColor(secondaryColor)
         .text(`打卡率：${reportData.checkInRate || 0}%`);
      doc.moveDown(1.5);

      // ===== 分隔线 =====
      doc.moveTo(40, doc.y).lineTo(550, doc.y)
         .strokeColor(borderColor).lineWidth(1).stroke();
      doc.moveDown(0.5);

      // ===== 免责声明 =====
      doc.fontSize(8).font('Helvetica-Oblique').fillColor(lightColor)
         .text('📌 免责声明：本报告基于自记录数据生成，仅供参考，不能替代医生的专业诊断和建议。', {
           align: 'center',
           paragraphGap: 4
         });
      doc.fontSize(8).fillColor(lightColor)
         .text('—— 银屑助手 · 你的温和陪伴者', { align: 'center' });

      // 结束文档
      doc.end();
    });

    // 上传到云存储
    const fileName = `health_report_${Date.now()}.pdf`;
    const result = await cloud.uploadFile({
      cloudPath: `reports/${fileName}`,
      fileContent: pdfBuffer
    });

    return {
      fileID: result.fileID
    };

  } catch (err) {
    console.error('PDF生成失败:', err);
    return {
      error: err.message || 'PDF生成失败'
    };
  }
};
