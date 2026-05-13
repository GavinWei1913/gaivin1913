// 云函数：生成健康报告PDF
// 使用 pdfkit 生成专业PDF报告
// 部署前请运行: npm install pdfkit

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 如果安装了 pdfkit 则使用，否则返回文本降级
let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch (e) {
  // 未安装 pdfkit，返回降级方案
}

exports.main = async (event, context) => {
  const { nickname, date, period, reportData, records, habitCheckIns } = event;
  
  if (!PDFDocument) {
    return {
      success: false,
      error: 'PDF生成库未安装，请在云函数目录执行: npm install pdfkit',
      fallback: true
    };
  }

  try {
    const buffer = await generatePDF({ nickname, date, period, reportData, records, habitCheckIns });
    
    // 上传到云存储
    const fileID = await uploadPDF(buffer, nickname, date);
    
    return {
      success: true,
      fileID: fileID
    };
  } catch (err) {
    console.error('PDF生成失败:', err);
    return {
      success: false,
      error: err.message || 'PDF生成失败'
    };
  }
};

async function generatePDF({ nickname, date, period, reportData, records, habitCheckIns }) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `${nickname} - 银屑病健康报告`,
      Author: '银屑助手',
      Subject: '健康评估报告',
      CreationDate: new Date()
    }
  });

  const buffers = [];
  doc.on('data', chunk => buffers.push(chunk));

  // ===== 封面 =====
  doc.fontSize(28).font('Helvetica-Bold')
     .text('📊 健康报告', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica')
     .text(nickname, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#666')
     .text(`报告周期：${period}`, { align: 'center' })
     .text(`生成日期：${date}`, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#999')
     .text('—— 银屑助手 · 你的温和陪伴者', { align: 'center' });

  doc.addPage();

  // ===== 总览 =====
  doc.fontSize(18).font('Helvetica-Bold').fillColor('#2E7D5B')
     .text('📋 报告总览', { underline: false });
  doc.moveDown(0.5);

  const overviewItems = [
    ['记录天数', reportData.totalDays + ' 天'],
    ['平均抗炎指数', reportData.averageScore + ' 分'],
    ['润肤打卡率', reportData.checkInRate + '%'],
    ['饮食合规率', reportData.dietRate + '%'],
    ['补剂依从率', reportData.suppRate + '%'],
    ['连续打卡', reportData.continuousCheckInDays + ' 天']
  ];

  overviewItems.forEach(([label, value]) => {
    doc.fontSize(11).font('Helvetica').fillColor('#333')
       .text(`• ${label}：`, { continued: true })
       .font('Helvetica-Bold').fillColor('#2E7D5B')
       .text(value);
  });

  doc.moveDown(1);

  // ===== 瘙痒趋势 =====
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#2E7D5B')
     .text('😊 瘙痒趋势');
  doc.moveDown(0.3);
  
  const trendText = reportData.itchTrend === 'improving' ? '改善 ↑' : 
                    reportData.itchTrend === 'worsening' ? '加重 ↓' : '稳定 →';
  doc.fontSize(11).font('Helvetica').fillColor('#333')
     .text(`趋势：${trendText}`);
  
  if (reportData.itchChartData && reportData.itchChartData.length > 0) {
    const values = reportData.itchChartData.map(d => d.value).join(' → ');
    doc.fontSize(10).fillColor('#666')
       .text(`瘙痒评分变化：${values}`);
  }
  doc.moveDown(0.5);

  // ===== 皮损变化 =====
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#2E7D5B')
     .text('📋 皮损面积变化');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica').fillColor('#333')
     .text(`好转 ${reportData.improveDays} 天 | 稳定 ${reportData.stableDays} 天 | 加重 ${reportData.worsenDays} 天`);
  doc.moveDown(0.5);

  // ===== 饮食 =====
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#2E7D5B')
     .text('🍽️ 饮食执行');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica').fillColor('#333')
     .text(`饮食合规率：${reportData.dietRate}%`);
  doc.moveDown(0.5);

  // ===== 心情 =====
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#2E7D5B')
     .text('😌 心情趋势');
  doc.moveDown(0.3);
  const moodText = reportData.moodTrend === 'improving' ? '变好 ↑' : 
                   reportData.moodTrend === 'worsening' ? '变差 ↓' : '稳定 →';
  doc.fontSize(11).font('Helvetica').fillColor('#333')
     .text(`趋势：${moodText}`);
  doc.moveDown(0.5);

  // ===== 感染预警 =====
  if (reportData.infectionDays > 0) {
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#C62828')
       .text('⚠️ 感染预警');
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').fillColor('#C62828')
       .text(`报告期内有 ${reportData.infectionDays} 天记录了咽痛/感冒症状。`);
    doc.moveDown(0.5);
  }

  // ===== 润肤 =====
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#2E7D5B')
     .text('🧴 润肤打卡');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica').fillColor('#333')
     .text(`打卡天数：${reportData.checkInDays} 天`);
  doc.fontSize(11).font('Helvetica').fillColor('#333')
     .text(`连续打卡：${reportData.continuousCheckInDays} 天`);
  doc.fontSize(11).font('Helvetica').fillColor('#333')
     .text(`打卡率：${reportData.checkInRate}%`);
  doc.moveDown(0.5);

  // ===== 补剂 =====
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#B39DDB')
     .text('💊 营养补剂');
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica').fillColor('#333')
     .text(`补剂依从率：${reportData.suppRate}%`);
  if (reportData.suppDetailData && reportData.suppDetailData.length > 0) {
    reportData.suppDetailData.forEach(s => {
      doc.fontSize(10).fillColor('#666')
         .text(`  ${s.icon} ${s.name}：${s.rate}%（${s.takenDays}/${s.totalDays}天）`);
    });
  }
  doc.moveDown(0.5);

  // ===== 最近记录明细 =====
  if (records && records.length > 0) {
    const recentRecords = records.slice(-14).reverse(); // 最近14天
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#2E7D5B')
       .text('📅 最近记录明细');
    doc.moveDown(0.3);

    recentRecords.forEach(r => {
      const itchLabel = ['无瘙痒', '轻微', '中度', '较重', '严重'][r.itch] || '—';
      const areaLabel = r.area === 'decrease' ? '好转' : r.area === 'stable' ? '稳定' : r.area === 'increase' ? '加重' : '—';
      const moodLabel = ['很差', '不好', '一般', '不错', '很棒'][r.mood] || '—';
      
      doc.fontSize(9).font('Helvetica').fillColor('#333')
         .text(`${r.date}  |  瘙痒:${itchLabel}  |  皮损:${areaLabel}  |  心情:${moodLabel}  |  评分:${r.score || '—'}`);
    });
  }

  // ===== 免责声明 =====
  doc.moveDown(1.5);
  doc.fontSize(8).fillColor('#999')
     .text('📌 免责声明：本报告基于用户自记录数据生成，仅供参考，不能替代医生的专业诊断和建议。如有严重症状，请及时就医。', {
       align: 'center',
       width: 400
     });

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', reject);
  });
}

async function uploadPDF(buffer, nickname, date) {
  const fileName = `${nickname}_健康报告_${date}.pdf`;
  
  try {
    const result = await cloud.uploadFile({
      cloudPath: `reports/${date}_${Date.now()}.pdf`,
      fileContent: buffer
    });
    return result.fileID;
  } catch (err) {
    console.error('上传失败:', err);
    throw new Error('文件上传失败');
  }
}
