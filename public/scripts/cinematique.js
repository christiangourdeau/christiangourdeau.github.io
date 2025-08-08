// @ts-nocheck
// --- DOM Elements ---
const guideBtn = document.getElementById('guideBtn');
const guideModal = document.getElementById('guideModal');
const closeGuideBtn = document.getElementById('closeGuideBtn');
const nbPointsSelect = document.getElementById('nbPoints');
const tMaxInput = document.getElementById('tMaxInput');
const vMaxInput = document.getElementById('vMaxInput');
const x0Input = document.getElementById('x0Input');
const dragStepXInput = document.getElementById('dragStepXInput');
const dragStepYInput = document.getElementById('dragStepYInput');
const narrativeTextDiv = document.getElementById('narrative-text');
const analysisContentDiv = document.getElementById('analysis-content');

// --- Simulation Elements ---
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const simTimeSlider = document.getElementById('simTimeSlider');
const simSpeedSlider = document.getElementById('simSpeedSlider');
const simSpeedReadout = document.getElementById('simSpeedReadout');
const showVelVectorCheckbox = document.getElementById('showVelVectorCheckbox');
const showAccelVectorCheckbox = document.getElementById('showAccelVectorCheckbox');
const readoutTime = document.getElementById('readout-time');
const readoutPos = document.getElementById('readout-pos');
const readoutVel = document.getElementById('readout-vel');
const readoutAccel = document.getElementById('readout-accel');

// --- Global State ---
let velocityChart, positionChart, accelerationChart, simulationChart;
let kinematicData = {
    t_points: [], v_points: [], accelerations: [],
    positionCurve: { t: [], x: [] }, segmentStartPositions: [],
};
let analyzerState = {
    tangentActive: false, tangentTime: null, tangentPosition: null, tangentVelocity: null,
    hoveredVelocityPointIndex: null,
    velocityAreaClickState: 'idle',
    velocityAreaT1: null,
    velocityAreaT2: null,
    accelerationAreaClickState: 'idle',
    accelerationAreaT1: null,
    accelerationAreaT2: null,
    isDragging: false,
    draggedPointIndex: null,
    draggedPointCoords: { x: 0, y: 0 }
};
// MODIFIÉ : Ajout de t_end_motion pour garder en mémoire la durée réelle de la simulation.
let simState = { isRunning: false, isPaused: false, animationFrameId: null, currentTime: 0, lastTimestamp: 0, v_max: 0, a_max: 0, t_end_motion: 40 };

const stopIconSVG = '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"></path></svg>';
const resetIconSVG = '<svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"></path></svg>';

// --- Guide Modal Logic ---
guideBtn.addEventListener('click', () => {
    guideModal.style.display = 'flex';
});
closeGuideBtn.addEventListener('click', () => {
    guideModal.style.display = 'none';
});
guideModal.addEventListener('click', (e) => {
    if (e.target === guideModal) { // Ferme si on clique sur l'arrière-plan
        guideModal.style.display = 'none';
    }
});

// --- Chart.js Plugins ---
const axisArrowsPlugin = {
    id: 'axisArrows',
    afterDraw: (chart) => {
        const { ctx, chartArea, scales: { x, y } } = chart;
        if (!x || !y) return;
        const arrowSize = 12;
        const axisExtension = 15;
        const arrowColor = '#ecf0f1';
        ctx.save();
        ctx.strokeStyle = arrowColor;
        ctx.fillStyle = arrowColor;
        ctx.lineWidth = 2.5;
        const x0 = x.getPixelForValue(0);
        const y0 = y.getPixelForValue(0);

        // Draw Y-Axis Arrow
        if (x0 >= chartArea.left && x0 <= chartArea.right) {
            const yEnd = chartArea.top - axisExtension;
            ctx.beginPath(); ctx.moveTo(x0, chartArea.bottom); ctx.lineTo(x0, yEnd); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x0, yEnd); ctx.lineTo(x0 - arrowSize / 2, yEnd + arrowSize); ctx.moveTo(x0, yEnd); ctx.lineTo(x0 + arrowSize / 2, yEnd + arrowSize); ctx.stroke();
        }
        // Draw X-Axis Arrow
        if (y0 >= chartArea.top && y0 <= chartArea.bottom) {
            const xEnd = chartArea.right + axisExtension;
            ctx.beginPath(); ctx.moveTo(chartArea.left, y0); ctx.lineTo(xEnd, y0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(xEnd, y0); ctx.lineTo(xEnd - arrowSize, y0 - arrowSize / 2); ctx.moveTo(xEnd, y0); ctx.lineTo(xEnd - arrowSize, y0 + arrowSize / 2); ctx.stroke();
        }

        ctx.fillStyle = '#ecf0f1';
        const labelFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

        // --- X-AXIS LABEL (t (s)) ---
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        const xLabelYPos = y0 + 10;
        const xLabelXPos_end = chartArea.right + axisExtension + 12;
        ctx.font = `14px ${labelFont}`;
        ctx.fillText('(s)', xLabelXPos_end, xLabelYPos);
        const sMetrics = ctx.measureText('(s)');
        ctx.font = `italic 14px ${labelFont}`;
        ctx.fillText('t', xLabelXPos_end - sMetrics.width, xLabelYPos);

        // --- Y-AXIS LABEL (v, x, a) ---
        let yVar = '';
        let yUnit = '';
        if (chart.canvas.id === 'position-chart') { yVar = 'x'; yUnit = '(m)'; }
        else if (chart.canvas.id === 'velocity-chart') { yVar = 'v'; yUnit = '(m/s)'; }
        else if (chart.canvas.id === 'acceleration-chart') { yVar = 'a'; yUnit = '(m/s²)'; }

        if (yVar) {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const yLabelYPos = chartArea.top - axisExtension - 18;
            const yLabelXPos_start = x0 - 15;

            ctx.font = `italic 14px ${labelFont}`;
            ctx.fillText(yVar, yLabelXPos_start, yLabelYPos);

            const varMetrics = ctx.measureText(yVar);

            ctx.font = `14px ${labelFont}`;
            ctx.fillText(yUnit, yLabelXPos_start + varMetrics.width + 2, yLabelYPos);
        }

        ctx.restore();
    }
};

const analyzerPlugin = { id: 'analyzer', beforeDatasetsDraw(chart) { }, afterDraw(chart) { } };
analyzerPlugin.beforeDatasetsDraw = (chart) => { const { ctx, scales: { x, y }, chartArea } = chart; ctx.save(); const vizColor1 = 'rgba(255, 255, 255, 0.07)'; const vizColor2 = 'rgba(0, 0, 0, 0.1)'; if (chart.canvas.id === 'position-chart') { for (let i = 0; i < kinematicData.accelerations.length; i++) { const a = kinematicData.accelerations[i], t_start = kinematicData.t_points[i], t_end = kinematicData.t_points[i + 1]; const x_start_pixel = x.getPixelForValue(t_start), x_end_pixel = x.getPixelForValue(t_end); if (a > 1e-9) { ctx.fillStyle = vizColor1; } else if (a < -1e-9) { ctx.fillStyle = vizColor2; } else { continue; } ctx.fillRect(x_start_pixel, chartArea.top, x_end_pixel - x_start_pixel, chartArea.height); } } if (chart.canvas.id === 'velocity-chart') { const yZeroPixel = y.getPixelForValue(0); const colors = ['rgba(142, 68, 173, 0.6)', 'rgba(155, 89, 182, 0.35)']; kinematicData.geometricShapes.forEach((shape, i) => { const { polygonPoints } = shape; if (!polygonPoints || polygonPoints.length < 2) return; ctx.beginPath(); ctx.moveTo(x.getPixelForValue(polygonPoints[0].t), yZeroPixel); polygonPoints.forEach(p => ctx.lineTo(x.getPixelForValue(p.t), y.getPixelForValue(p.v))); ctx.lineTo(x.getPixelForValue(polygonPoints[polygonPoints.length - 1].t), yZeroPixel); ctx.closePath(); ctx.fillStyle = colors[i % 2]; ctx.fill(); }); } ctx.restore(); };
analyzerPlugin.afterDraw = (chart) => {
    const { ctx, scales: { x, y }, chartArea } = chart;
    ctx.save();
    const vizColor = '#FFFFFF';
    const vAreaFillColor = 'rgba(52, 152, 219, 0.5)';
    const aAreaFillColor = 'rgba(231, 76, 60, 0.5)';
    const dashLineColor = 'rgba(255, 255, 255, 0.7)';

    if (chart.canvas.id === 'position-chart') {
        ctx.save();
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(236, 240, 241, 0.7)';
        for (let i = 0; i < kinematicData.accelerations.length; i++) {
            const a = kinematicData.accelerations[i];
            const t_start = kinematicData.t_points[i];
            const t_end = kinematicData.t_points[i + 1];
            const x_start_pixel = x.getPixelForValue(t_start);
            const x_end_pixel = x.getPixelForValue(t_end);
            if (x_end_pixel - x_start_pixel < 20) continue; // Empêche l'affichage sur des segments trop petits
            const x_center_pixel = (x_start_pixel + x_end_pixel) / 2;
            const y_pixel = chartArea.top + 10;
            if (a > 1e-9) {
                ctx.fillText('a > 0', x_center_pixel, y_pixel);
            } else if (a < -1e-9) {
                ctx.fillText('a < 0', x_center_pixel, y_pixel);
            } else {
                ctx.fillText('a = 0', x_center_pixel, y_pixel);
            }
        }
        ctx.restore();
    }

    if (analyzerState.tangentActive) {
        const time = analyzerState.tangentTime; const xPixel = x.getPixelForValue(time);
        if (chart.canvas.id === 'position-chart' || chart.canvas.id === 'velocity-chart') { ctx.beginPath(); ctx.setLineDash([5, 5]); ctx.moveTo(xPixel, chartArea.top); ctx.lineTo(xPixel, chartArea.bottom); ctx.strokeStyle = dashLineColor; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }
        if (chart.canvas.id === 'position-chart') { const posPixel = y.getPixelForValue(analyzerState.tangentPosition); const physicalSlope = analyzerState.tangentVelocity; const yScale = y.height / (y.max - y.min); const xScale = x.width / (x.max - x.min); const visualSlope = -physicalSlope * (yScale / xScale); const tangentLength = 60; const x1 = xPixel - tangentLength, y1 = posPixel - tangentLength * visualSlope; const x2 = xPixel + tangentLength, y2 = posPixel + tangentLength * visualSlope; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = vizColor; ctx.lineWidth = 3; ctx.stroke(); ctx.beginPath(); ctx.arc(xPixel, posPixel, 6, 0, 2 * Math.PI); ctx.fillStyle = vizColor; ctx.fill(); ctx.fillStyle = vizColor; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left'; ctx.fillText(`v = ${physicalSlope.toFixed(2)} m/s`, xPixel + 15, posPixel - 15); }
        if (chart.canvas.id === 'velocity-chart') { const velPixel = y.getPixelForValue(analyzerState.tangentVelocity); ctx.beginPath(); ctx.arc(xPixel, velPixel, 6, 0, 2 * Math.PI); ctx.fillStyle = vizColor; ctx.fill(); }
    }
    else if (analyzerState.velocityAreaClickState === 'first_click_done') {
        const t1 = 0, t2 = analyzerState.velocityAreaT1;
        if (chart.canvas.id === 'velocity-chart' || chart.canvas.id === 'position-chart') {
            const xPixel2 = x.getPixelForValue(t2);
            ctx.beginPath(); ctx.setLineDash([5, 5]); ctx.moveTo(xPixel2, chartArea.top); ctx.lineTo(xPixel2, chartArea.bottom); ctx.strokeStyle = dashLineColor; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
        }
        if (chart.canvas.id === 'velocity-chart') { const polygonPoints = [{ x: t1, y: getVelocityAtTime(t1) }]; velocityChart.data.datasets[0].data.forEach(p => { if (p.x > t1 && p.x < t2) polygonPoints.push({ x: p.x, y: p.y }) }); polygonPoints.push({ x: t2, y: getVelocityAtTime(t2) }); ctx.beginPath(); ctx.moveTo(x.getPixelForValue(t1), y.getPixelForValue(0)); polygonPoints.forEach(p => ctx.lineTo(x.getPixelForValue(p.x), y.getPixelForValue(p.y))); ctx.lineTo(x.getPixelForValue(t2), y.getPixelForValue(0)); ctx.closePath(); ctx.fillStyle = vAreaFillColor; ctx.fill(); const deltaX = getPositionAtTime(t2) - getPositionAtTime(t1); const deltaS = calculateDistance(t1, t2); ctx.fillStyle = vizColor; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; const textX = chartArea.right - 15; const textY1 = chartArea.top + 15; const textY2 = chartArea.top + 35; let currentX; const textForDeltaX = ` = ${deltaX.toFixed(2)} m`; ctx.font = 'bold 14px Arial'; const restMetricX = ctx.measureText(textForDeltaX); ctx.font = 'bold italic 14px Arial'; const xMetric = ctx.measureText('x'); ctx.font = 'bold 14px Arial'; const deltaMetricX = ctx.measureText('Δ'); currentX = textX; ctx.font = 'bold 14px Arial'; ctx.fillText(textForDeltaX, currentX, textY1); currentX -= restMetricX.width; ctx.font = 'bold italic 14px Arial'; ctx.fillText('x', currentX, textY1); currentX -= xMetric.width; ctx.font = 'bold 14px Arial'; ctx.fillText('Δ', currentX, textY1); const textForDeltaS = ` = ${deltaS.toFixed(2)} m`; ctx.font = 'bold 14px Arial'; const restMetricS = ctx.measureText(textForDeltaS); ctx.font = 'bold italic 14px Arial'; const sMetric = ctx.measureText('s'); ctx.font = 'bold 14px Arial'; const deltaMetricS = ctx.measureText('Δ'); currentX = textX; ctx.font = 'bold 14px Arial'; ctx.fillText(textForDeltaS, currentX, textY2); currentX -= restMetricS.width; ctx.font = 'bold italic 14px Arial'; ctx.fillText('s', currentX, textY2); currentX -= sMetric.width; ctx.font = 'bold 14px Arial'; ctx.fillText('Δ', currentX, textY2); }
        if (chart.canvas.id === 'position-chart') { const pos1 = getPositionAtTime(t1), pos2 = getPositionAtTime(t2); const xPixel1 = x.getPixelForValue(t1), yPixel1 = y.getPixelForValue(pos1); const xPixel2 = x.getPixelForValue(t2), yPixel2 = y.getPixelForValue(pos2); ctx.fillStyle = vizColor; ctx.strokeStyle = vizColor; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(xPixel1, yPixel1, 6, 0, 2 * Math.PI); ctx.fill(); ctx.beginPath(); ctx.arc(xPixel2, yPixel2, 6, 0, 2 * Math.PI); ctx.fill(); ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(xPixel1, yPixel1); ctx.lineTo(xPixel2, yPixel1); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(xPixel2, yPixel1); ctx.lineTo(xPixel2, yPixel2); ctx.lineWidth = 2.5; ctx.stroke(); const arrowSize = 8, dir = Math.sign(yPixel1 - yPixel2) || 1; ctx.beginPath(); ctx.moveTo(xPixel2, yPixel2); ctx.lineTo(xPixel2 - arrowSize / 2, yPixel2 + dir * arrowSize); ctx.moveTo(xPixel2, yPixel2); ctx.lineTo(xPixel2 + arrowSize / 2, yPixel2 + dir * arrowSize); ctx.stroke(); const deltaX = pos2 - pos1; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; const startX = xPixel2 + 10; const startY = (yPixel1 + yPixel2) / 2; const textForDeltaX = ` = ${deltaX.toFixed(2)} m`; ctx.font = 'bold 14px Arial'; ctx.fillText('Δ', startX, startY); const deltaMetric = ctx.measureText('Δ'); let currentX = startX + deltaMetric.width; ctx.font = 'bold italic 14px Arial'; ctx.fillText('x', currentX, startY); const xMetric = ctx.measureText('x'); currentX += xMetric.width; ctx.font = 'bold 14px Arial'; ctx.fillText(textForDeltaX, currentX, startY); }
    } else if (analyzerState.velocityAreaClickState === 'second_click_done') {
        let t1 = analyzerState.velocityAreaT1; let t2 = analyzerState.velocityAreaT2;
        if (t1 > t2) [t1, t2] = [t2, t1];
        if (chart.canvas.id === 'velocity-chart') { const polygonPoints = [{ x: t1, y: getVelocityAtTime(t1) }]; velocityChart.data.datasets[0].data.forEach(p => { if (p.x > t1 && p.x < t2) polygonPoints.push({ x: p.x, y: p.y }) }); polygonPoints.push({ x: t2, y: getVelocityAtTime(t2) }); ctx.beginPath(); ctx.moveTo(x.getPixelForValue(t1), y.getPixelForValue(0)); polygonPoints.forEach(p => ctx.lineTo(x.getPixelForValue(p.x), y.getPixelForValue(p.y))); ctx.lineTo(x.getPixelForValue(t2), y.getPixelForValue(0)); ctx.closePath(); ctx.fillStyle = vAreaFillColor; ctx.fill(); const deltaX = getPositionAtTime(t2) - getPositionAtTime(t1); const deltaS = calculateDistance(t1, t2); ctx.fillStyle = vizColor; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; const textX = chartArea.right - 15; const textY1 = chartArea.top + 15; const textY2 = chartArea.top + 35; let currentX; const textForDeltaX = ` = ${deltaX.toFixed(2)} m`; ctx.font = 'bold 14px Arial'; const restMetricX = ctx.measureText(textForDeltaX); ctx.font = 'bold italic 14px Arial'; const xMetric = ctx.measureText('x'); ctx.font = 'bold 14px Arial'; const deltaMetricX = ctx.measureText('Δ'); currentX = textX; ctx.font = 'bold 14px Arial'; ctx.fillText(textForDeltaX, currentX, textY1); currentX -= restMetricX.width; ctx.font = 'bold italic 14px Arial'; ctx.fillText('x', currentX, textY1); currentX -= xMetric.width; ctx.font = 'bold 14px Arial'; ctx.fillText('Δ', currentX, textY1); const textForDeltaS = ` = ${deltaS.toFixed(2)} m`; ctx.font = 'bold 14px Arial'; const restMetricS = ctx.measureText(textForDeltaS); ctx.font = 'bold italic 14px Arial'; const sMetric = ctx.measureText('s'); ctx.font = 'bold 14px Arial'; const deltaMetricS = ctx.measureText('Δ'); currentX = textX; ctx.font = 'bold 14px Arial'; ctx.fillText(textForDeltaS, currentX, textY2); currentX -= restMetricS.width; ctx.font = 'bold italic 14px Arial'; ctx.fillText('s', currentX, textY2); currentX -= sMetric.width; ctx.font = 'bold 14px Arial'; ctx.fillText('Δ', currentX, textY2); }
        if (chart.canvas.id === 'position-chart') { const pos1 = getPositionAtTime(t1), pos2 = getPositionAtTime(t2); const xPixel1 = x.getPixelForValue(t1), yPixel1 = y.getPixelForValue(pos1); const xPixel2 = x.getPixelForValue(t2), yPixel2 = y.getPixelForValue(pos2); ctx.fillStyle = vizColor; ctx.strokeStyle = vizColor; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(xPixel1, yPixel1, 6, 0, 2 * Math.PI); ctx.fill(); ctx.beginPath(); ctx.arc(xPixel2, yPixel2, 6, 0, 2 * Math.PI); ctx.fill(); ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(xPixel1, yPixel1); ctx.lineTo(xPixel2, yPixel1); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(xPixel2, yPixel1); ctx.lineTo(xPixel2, yPixel2); ctx.lineWidth = 2.5; ctx.stroke(); const arrowSize = 8, dir = Math.sign(yPixel1 - yPixel2) || 1; ctx.beginPath(); ctx.moveTo(xPixel2, yPixel2); ctx.lineTo(xPixel2 - arrowSize / 2, yPixel2 + dir * arrowSize); ctx.moveTo(xPixel2, yPixel2); ctx.lineTo(xPixel2 + arrowSize / 2, yPixel2 + dir * arrowSize); ctx.stroke(); const deltaX = pos2 - pos1; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; const startX = xPixel2 + 10; const startY = (yPixel1 + yPixel2) / 2; const textForDeltaX = ` = ${deltaX.toFixed(2)} m`; ctx.font = 'bold 14px Arial'; ctx.fillText('Δ', startX, startY); const deltaMetric = ctx.measureText('Δ'); let currentX = startX + deltaMetric.width; ctx.font = 'bold italic 14px Arial'; ctx.fillText('x', currentX, startY); const xMetric = ctx.measureText('x'); currentX += xMetric.width; ctx.font = 'bold 14px Arial'; ctx.fillText(textForDeltaX, currentX, startY); }
    }
    else if (analyzerState.accelerationAreaClickState === 'first_click_done') {
        const t1 = 0, t2 = analyzerState.accelerationAreaT1;
        if (chart.canvas.id === 'acceleration-chart' || chart.canvas.id === 'velocity-chart') { const xPixel2 = x.getPixelForValue(t2); ctx.beginPath(); ctx.setLineDash([5, 5]); ctx.moveTo(xPixel2, chartArea.top); ctx.lineTo(xPixel2, chartArea.bottom); ctx.strokeStyle = dashLineColor; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); if (chart.canvas.id === 'velocity-chart') { const vel2 = getVelocityAtTime(t2); const yPixel2 = y.getPixelForValue(vel2); ctx.beginPath(); ctx.arc(xPixel2, yPixel2, 6, 0, 2 * Math.PI); ctx.fillStyle = vizColor; ctx.fill(); ctx.fillStyle = vizColor; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left'; ctx.fillText(`v= ${vel2.toFixed(2)} m/s`, xPixel2 + 15, yPixel2 - 15); } }
        if (chart.canvas.id === 'acceleration-chart') { const yZeroPixel = y.getPixelForValue(0); ctx.fillStyle = aAreaFillColor; for (let i = 0; i < kinematicData.accelerations.length; i++) { const seg_start = kinematicData.t_points[i]; const seg_end = kinematicData.t_points[i + 1]; const a = kinematicData.accelerations[i]; const draw_start = Math.max(t1, seg_start); const draw_end = Math.min(t2, seg_end); if (draw_start < draw_end) { ctx.fillRect(x.getPixelForValue(draw_start), y.getPixelForValue(a), x.getPixelForValue(draw_end) - x.getPixelForValue(draw_start), yZeroPixel - y.getPixelForValue(a)); } } const deltaV = getVelocityAtTime(t2) - getVelocityAtTime(t1); ctx.fillStyle = vizColor; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; const textX = chartArea.right - 15; const textY = chartArea.top + 15; let currentX; const textForDeltaV = ` = ${deltaV.toFixed(2)} m/s`; ctx.font = 'bold 14px Arial'; const restMetric = ctx.measureText(textForDeltaV); ctx.font = 'bold italic 14px Arial'; const vMetric = ctx.measureText('v'); ctx.font = 'bold 14px Arial'; const deltaMetric = ctx.measureText('Δ'); currentX = textX; ctx.font = 'bold 14px Arial'; ctx.fillText(textForDeltaV, currentX, textY); currentX -= restMetric.width; ctx.font = 'bold italic 14px Arial'; ctx.fillText('v', currentX, textY); currentX -= vMetric.width; ctx.font = 'bold 14px Arial'; ctx.fillText('Δ', currentX, textY); }
    } else if (analyzerState.accelerationAreaClickState === 'second_click_done') {
        let t1 = analyzerState.accelerationAreaT1; let t2 = analyzerState.accelerationAreaT2;
        if (t1 > t2) [t1, t2] = [t2, t1];
        if (chart.canvas.id === 'acceleration-chart') { const yZeroPixel = y.getPixelForValue(0); ctx.fillStyle = aAreaFillColor; for (let i = 0; i < kinematicData.accelerations.length; i++) { const seg_start = kinematicData.t_points[i]; const seg_end = kinematicData.t_points[i + 1]; const a = kinematicData.accelerations[i]; const draw_start = Math.max(t1, seg_start); const draw_end = Math.min(t2, seg_end); if (draw_start < draw_end) { ctx.fillRect(x.getPixelForValue(draw_start), y.getPixelForValue(a), x.getPixelForValue(draw_end) - x.getPixelForValue(draw_start), yZeroPixel - y.getPixelForValue(a)); } } const deltaV = getVelocityAtTime(t2) - getVelocityAtTime(t1); ctx.fillStyle = vizColor; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; const textX = chartArea.right - 15; const textY = chartArea.top + 15; let currentX; const textForDeltaV = ` = ${deltaV.toFixed(2)} m/s`; ctx.font = 'bold 14px Arial'; const restMetric = ctx.measureText(textForDeltaV); ctx.font = 'bold italic 14px Arial'; const vMetric = ctx.measureText('v'); ctx.font = 'bold 14px Arial'; const deltaMetric = ctx.measureText('Δ'); currentX = textX; ctx.font = 'bold 14px Arial'; ctx.fillText(textForDeltaV, currentX, textY); currentX -= restMetric.width; ctx.font = 'bold italic 14px Arial'; ctx.fillText('v', currentX, textY); currentX -= vMetric.width; ctx.font = 'bold 14px Arial'; ctx.fillText('Δ', currentX, textY); }
        if (chart.canvas.id === 'velocity-chart') { const vel1 = getVelocityAtTime(t1), vel2 = getVelocityAtTime(t2); const xPixel1 = x.getPixelForValue(t1), yPixel1 = y.getPixelForValue(vel1); const xPixel2 = x.getPixelForValue(t2), yPixel2 = y.getPixelForValue(vel2); ctx.fillStyle = vizColor; ctx.strokeStyle = vizColor; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(xPixel1, yPixel1, 6, 0, 2 * Math.PI); ctx.fill(); ctx.beginPath(); ctx.arc(xPixel2, yPixel2, 6, 0, 2 * Math.PI); ctx.fill(); ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(xPixel1, yPixel1); ctx.lineTo(xPixel2, yPixel1); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(xPixel2, yPixel1); ctx.lineTo(xPixel2, yPixel2); ctx.lineWidth = 2.5; ctx.stroke(); const arrowSize = 8, dir = Math.sign(yPixel1 - yPixel2) || 1; ctx.beginPath(); ctx.moveTo(xPixel2, yPixel2); ctx.lineTo(xPixel2 - arrowSize / 2, yPixel2 + dir * arrowSize); ctx.moveTo(xPixel2, yPixel2); ctx.lineTo(xPixel2 + arrowSize / 2, yPixel2 + dir * arrowSize); ctx.stroke(); const deltaV = vel2 - vel1; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; const startX = xPixel2 + 10; const startY = (yPixel1 + yPixel2) / 2; const textForDeltaV = ` = ${deltaV.toFixed(2)} m/s`; ctx.font = 'bold 14px Arial'; ctx.fillText('Δ', startX, startY); const deltaMetric = ctx.measureText('Δ'); let currentX = startX + deltaMetric.width; ctx.font = 'bold italic 14px Arial'; ctx.fillText('v', currentX, startY); const vMetric = ctx.measureText('v'); currentX += vMetric.width; ctx.font = 'bold 14px Arial'; ctx.fillText(textForDeltaV, currentX, startY); }
    }

    if (chart.canvas.id === 'velocity-chart' && analyzerState.hoveredVelocityPointIndex !== null && !analyzerState.isDragging) {
        const index = analyzerState.hoveredVelocityPointIndex;
        const point = chart.data.datasets[0].data[index];
        const { x: px, y: py } = chart.getDatasetMeta(0).data[index].getProps(['x', 'y'], true);
        const txt = `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = 'rgba(236, 240, 241, 0.9)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(txt, px + 10, py - 10);
    }

    if (chart.canvas.id === 'velocity-chart' && analyzerState.isDragging) {
        const index = analyzerState.draggedPointIndex;
        const point = analyzerState.draggedPointCoords;
        const { x: px, y: py } = chart.getDatasetMeta(0).data[index].getProps(['x', 'y'], true);
        const txt = `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = 'rgba(236, 240, 241, 0.9)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(txt, px + 10, py - 10);
    }


    if (chart.canvas.id === 'velocity-chart') { kinematicData.geometricShapes.forEach((shape) => { const { t1, t2, area } = shape; if (Math.abs(area) < 1e-9) return; const labelText = `${area.toFixed(1)} m`; ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; const x_center_pix = x.getPixelForValue((t1 + t2) / 2); const v_visual_avg = (t2 - t1) > 0 ? area / (t2 - t1) : 0; const y_center_pix = (y.getPixelForValue(v_visual_avg) + y.getPixelForValue(0)) / 2; ctx.fillText(labelText, x_center_pix, y_center_pix); }); }

    if (chart.canvas.id === 'acceleration-chart') {
        for (let i = 0; i < kinematicData.accelerations.length; i++) {
            const a = kinematicData.accelerations[i];
            const t1 = kinematicData.t_points[i];
            const t2 = kinematicData.t_points[i + 1];
            const deltaV = kinematicData.v_points[i + 1] - kinematicData.v_points[i];

            if (Math.abs(deltaV) < 1e-3) continue;

            const x_center_pix = x.getPixelForValue((t1 + t2) / 2);
            const y_a_pix = y.getPixelForValue(a);
            const y_zero_pix = y.getPixelForValue(0);
            const y_center_pix = (y_a_pix + y_zero_pix) / 2;

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const labelText = `${deltaV.toFixed(2)} m/s`;
            ctx.fillText(labelText, x_center_pix, y_center_pix);
        }
    }

    ctx.restore();
};

// --- Kinematics Functions ---
function getKinematicsAtTime(time) { const { t_points, v_points, accelerations, segmentStartPositions } = kinematicData; if (t_points.length === 0) return { x: 0, v: 0, a: 0 }; if (time <= t_points[0]) return { x: segmentStartPositions[0], v: v_points[0], a: accelerations[0] || 0 }; if (time >= t_points[t_points.length - 1]) { const lastIdx = t_points.length - 1; const dt = time - t_points[lastIdx]; const x_final = getPositionAtTime(t_points[lastIdx]); const v_final = v_points[lastIdx]; return { x: x_final + v_final * dt, v: v_final, a: 0 }; } let i = t_points.findIndex(t => t > time) - 1; if (i < 0) i = 0; const t_start = t_points[i], v_start = v_points[i], a = accelerations[i]; const dt = time - t_start; const v = v_start + a * dt; const x = segmentStartPositions[i] + v_start * dt + 0.5 * a * dt ** 2; return { x, v, a }; }
function getPositionAtTime(time) { const { t_points, v_points, accelerations, segmentStartPositions } = kinematicData; if (t_points.length === 0) return parseFloat(x0Input.value) || 0; if (time <= t_points[0]) return segmentStartPositions[0]; if (time >= t_points[t_points.length - 1]) { const lastIdx = t_points.length - 1; const dt = time - t_points[lastIdx]; const x_final = segmentStartPositions[lastIdx]; const v_final = v_points[lastIdx]; return x_final + v_final * dt; } let i = t_points.findIndex(t => t > time) - 1; if (i < 0) i = 0; const t_start = t_points[i], v_start = v_points[i], a = accelerations[i]; const dt = time - t_start; return segmentStartPositions[i] + v_start * dt + 0.5 * a * dt ** 2; }
function getVelocityAtTime(time) { const { t_points, v_points, accelerations } = kinematicData; if (t_points.length === 0) return 0; if (time <= t_points[0]) return v_points[0]; if (time >= t_points[t_points.length - 1]) return v_points[v_points.length - 1]; let i = t_points.findIndex(t => t > time) - 1; if (i < 0) i = 0; const t_start = t_points[i], v_start = v_points[i], a = accelerations[i]; const dt = time - t_start; return v_start + a * dt; }

function calculateDistance(t1, t2) {
    if (t1 >= t2) return 0;
    const { t_points, v_points, accelerations } = kinematicData;

    const eventTimes = new Set([t1, t2]);
    t_points.forEach(t => { if (t > t1 && t < t2) eventTimes.add(t); });

    for (let i = 0; i < accelerations.length; i++) {
        const seg_start = t_points[i], v_start = v_points[i], a = accelerations[i];
        if (v_start * getVelocityAtTime(t_points[i + 1]) < 0 && Math.abs(a) > 1e-9) {
            const t_cross = seg_start - v_start / a;
            if (t_cross > t1 && t_cross < t2) eventTimes.add(t_cross);
        }
    }

    const sortedTimes = Array.from(eventTimes).sort((a, b) => a - b);

    let totalDistance = 0;
    for (let i = 0; i < sortedTimes.length - 1; i++) {
        const start = sortedTimes[i], end = sortedTimes[i + 1];
        if (Math.abs(start - end) < 1e-9) continue;
        totalDistance += Math.abs(getPositionAtTime(end) - getPositionAtTime(start));
    }
    return totalDistance;
}

function calculateKinematics(times, velocities, initialPosition = 0) { if (times.length < 2) return { accelerations: [], positionCurve: { t: [], x: [] }, segmentStartPositions: [], geometricShapes: [] }; const accelerations = []; for (let i = 0; i < times.length - 1; i++) { const dt = times[i + 1] - times[i]; const dv = velocities[i + 1] - velocities[i]; accelerations.push(dt > 0 ? dv / dt : 0); } const positionCurve = { t: [], x: [] }; const segmentStartPositions = []; let currentPosition = initialPosition; positionCurve.t.push(times[0]); positionCurve.x.push(currentPosition); segmentStartPositions.push(currentPosition); for (let i = 0; i < accelerations.length; i++) { const t_start = times[i], v_start = velocities[i], a = accelerations[i]; const intervalDuration = times[i + 1] - t_start; const numSteps = 50; for (let step = 1; step <= numSteps; step++) { const dt_step = (intervalDuration * step) / numSteps; const t_current = t_start + dt_step; const displacement_in_step = v_start * dt_step + 0.5 * a * dt_step ** 2; positionCurve.t.push(t_current); positionCurve.x.push(currentPosition + displacement_in_step); } currentPosition += v_start * intervalDuration + 0.5 * a * intervalDuration ** 2; segmentStartPositions.push(currentPosition); } let baseShapes = []; let eventPoints = []; times.forEach((t, i) => eventPoints.push({ t, v: velocities[i] })); for (let i = 0; i < accelerations.length; i++) { const t1 = times[i], v1 = velocities[i], v2 = velocities[i + 1]; if (v1 * v2 < 0 && Math.abs(accelerations[i]) > 1e-9) { const t_cross = t1 - v1 / accelerations[i]; eventPoints.push({ t: t_cross, v: 0 }); } } eventPoints.sort((a, b) => a.t - b.t); eventPoints = eventPoints.filter((p, i, self) => i === 0 || Math.abs(p.t - self[i - 1].t) > 1e-9); for (let i = 0; i < eventPoints.length - 1; i++) { const p1 = eventPoints[i], p2 = eventPoints[i + 1]; const area = ((p1.v + p2.v) / 2) * (p2.t - p1.t); baseShapes.push({ points: [p1, p2], area: area, isComplex: false }); } if (baseShapes.length === 0) { return { accelerations, positionCurve, geometricShapes: [] }; } const finalShapes = []; if (baseShapes.length > 0) { let currentMergedShape = { ...baseShapes[0] }; for (let i = 1; i < baseShapes.length; i++) { const nextShape = baseShapes[i]; const p1_start = currentMergedShape.points[0]; const p2_junction = currentMergedShape.points[currentMergedShape.points.length - 1]; const p3_end = nextShape.points[nextShape.points.length - 1]; const isSameSign = (currentMergedShape.area * nextShape.area) >= 0; const slope1 = (p2_junction.v - p1_start.v) * (p3_end.t - p2_junction.t); const slope2 = (p3_end.v - p2_junction.v) * (p2_junction.t - p1_start.t); const areCollinear = !currentMergedShape.isComplex && Math.abs(slope1 - slope2) < 1e-9; const formsSingleTriangle = currentMergedShape.isComplex || (Math.abs(currentMergedShape.points[0].v) < 1e-9 && Math.abs(nextShape.points[1].v) < 1e-9); const canMerge = isSameSign && (areCollinear || formsSingleTriangle); if (canMerge) { currentMergedShape.area += nextShape.area; currentMergedShape.points.push(p3_end); if (formsSingleTriangle) { currentMergedShape.isComplex = true; } } else { finalShapes.push(currentMergedShape); currentMergedShape = { ...nextShape, points: [...nextShape.points] }; } } finalShapes.push(currentMergedShape); } const geometricShapes = finalShapes.map(shape => { const firstPoint = shape.points[0]; const lastPoint = shape.points[shape.points.length - 1]; return { polygonPoints: shape.points, area: shape.area, t1: firstPoint.t, v1: firstPoint.v, t2: lastPoint.t, v2: lastPoint.v, isComplex: shape.isComplex }; }); return { accelerations, positionCurve, segmentStartPositions, geometricShapes }; }

// --- Core Functions ---
function calculateNiceYAxisRange(dataMin, dataMax) { if (dataMin === dataMax) return { min: dataMin - 5, max: dataMax + 5 }; const range = dataMax - dataMin; const padding = range * 0.1 || 1; const paddedMin = dataMin - padding; const paddedMax = dataMax + padding; const paddedRange = paddedMax - paddedMin; const targetTicks = 8; const roughStep = paddedRange / targetTicks; const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep))); const residual = roughStep / magnitude; let niceStep; if (residual > 5) niceStep = 10 * magnitude; else if (residual > 2) niceStep = 5 * magnitude; else if (residual > 1) niceStep = 2 * magnitude; else niceStep = magnitude; const niceMin = Math.floor(paddedMin / niceStep) * niceStep; const niceMax = Math.ceil(paddedMax / niceStep) * niceStep; return { min: niceMin, max: niceMax }; }

function calculateNiceStep(range, targetTicks) {
    if (range <= 0) return 1;
    const roughStep = range / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const residual = roughStep / magnitude;
    let niceStep;
    if (residual > 5) {
        niceStep = 10 * magnitude;
    } else if (residual > 2) {
        niceStep = 5 * magnitude;
    } else if (residual > 1) {
        niceStep = 2 * magnitude;
    } else {
        niceStep = magnitude;
    }
    return niceStep;
}

function updateAllCharts(animation = 'none') {
    let tMax = parseFloat(tMaxInput.value);
    if (isNaN(tMax) || tMax <= 0) tMax = 40;
    let vMax = parseFloat(vMaxInput.value);
    if (isNaN(vMax) || vMax < 0) vMax = 20;

    const points = velocityChart.data.datasets[0].data;
    const dragStepX = parseFloat(dragStepXInput.value) || 0.5;
    const dragStepY = parseFloat(dragStepYInput.value) || 0.5;

    const TARGET_TICKS = 8;
    const xStepSize = calculateNiceStep(tMax, TARGET_TICKS);
    const yVelStepSize = calculateNiceStep(vMax * 2, TARGET_TICKS);

    [velocityChart, positionChart, accelerationChart].forEach(chart => {
        chart.options.scales.x.ticks.stepSize = xStepSize;
    });
    velocityChart.options.scales.y.ticks.stepSize = yVelStepSize;

    points.sort((a, b) => a.x - b.x);

    if (points.length > 1) {
        const snap = (value, step) => Math.round(value / step) * step;

        points.forEach(p => {
            p.x = snap(p.x, dragStepX);
            p.y = snap(p.y, dragStepY);
            p.x = Math.max(0, Math.min(p.x, tMax));
            p.y = Math.max(-vMax, Math.min(p.y, vMax));
        });

        points[0].x = 0;
        for (let i = 1; i < points.length; i++) {
            const minAllowedX = points[i - 1].x + dragStepX;
            if (points[i].x < minAllowedX) {
                points[i].x = minAllowedX;
            }
        }

        for (let i = points.length - 2; i >= 0; i--) {
            const maxAllowedX = points[i + 1].x - dragStepX;
            if (points[i].x > maxAllowedX) {
                points[i].x = maxAllowedX;
            }
        }
    }

    points.forEach(p => {
        p.x = parseFloat(p.x.toFixed(2));
        p.y = parseFloat(p.y.toFixed(2));
    });

    [velocityChart, positionChart, accelerationChart].forEach(chart => {
        chart.options.scales.x.max = tMax;
    });
    velocityChart.options.scales.y.min = -vMax;
    velocityChart.options.scales.y.max = vMax;

    // --- MODIFIÉ 1 : Définir la durée de l'animation ---
    // Détermine le temps du dernier point pour ajuster la simulation.
    // S'il n'y a pas assez de points, utilise tMax comme valeur par défaut.
    simState.t_end_motion = (points.length > 1 && points[points.length - 1].x > 0) ? points[points.length - 1].x : tMax;
    simTimeSlider.max = simState.t_end_motion;
    // --- FIN DE LA MODIFICATION 1 ---

    const x0 = parseFloat(x0Input.value) || 0;
    kinematicData.t_points = points.map(p => p.x);
    kinematicData.v_points = points.map(p => p.y);

    Object.assign(kinematicData, calculateKinematics(kinematicData.t_points, kinematicData.v_points, x0));

    positionChart.data.labels = kinematicData.positionCurve.t;
    positionChart.data.datasets[0].data = kinematicData.positionCurve.x;

    const accLabels = [], accValues = [];
    for (let i = 0; i < kinematicData.accelerations.length; i++) {
        accLabels.push(kinematicData.t_points[i], kinematicData.t_points[i + 1]);
        accValues.push(kinematicData.accelerations[i], kinematicData.accelerations[i]);
    }
    accelerationChart.data.labels = accLabels;
    accelerationChart.data.datasets[0].data = accValues;

    const posValues = kinematicData.positionCurve.x;
    if (posValues.length > 0) {
        const minActual = Math.min(x0, ...posValues);
        const maxActual = Math.max(x0, ...posValues);
        const rangeMin = Math.min(0, minActual);
        const rangeMax = Math.max(0, maxActual);
        const { min: niceMin, max: niceMax } = calculateNiceYAxisRange(rangeMin, rangeMax);
        positionChart.options.scales.y.min = niceMin;
        positionChart.options.scales.y.max = niceMax;
        const yPosStepSize = calculateNiceStep(niceMax - niceMin, TARGET_TICKS);
        positionChart.options.scales.y.ticks.stepSize = yPosStepSize;
    }

    if (kinematicData.accelerations.length > 0) {
        const minAccel = Math.min(0, ...kinematicData.accelerations);
        const maxAccel = Math.max(0, ...kinematicData.accelerations);
        const { min: niceMin, max: niceMax } = calculateNiceYAxisRange(minAccel, maxAccel);
        accelerationChart.options.scales.y.min = niceMin;
        accelerationChart.options.scales.y.max = niceMax;
        const yAccelStepSize = calculateNiceStep(niceMax - niceMin, TARGET_TICKS);
        accelerationChart.options.scales.y.ticks.stepSize = yAccelStepSize;
    }

    simState.v_max = Math.max(1, ...kinematicData.v_points.map(Math.abs));
    simState.a_max = Math.max(1, ...kinematicData.accelerations.map(Math.abs));

    [velocityChart, positionChart, accelerationChart].forEach(chart => chart.update(animation));

    simulationChart.options.scales.x.min = positionChart.options.scales.y.min;
    simulationChart.options.scales.x.max = positionChart.options.scales.y.max;
    simulationChart.update(animation);

    updateNarrative();
    updateAnalysis();
    resetSimulation();
}

function createChartOptions(title) {
    const textColor = '#ecf0f1';
    const gridColor = 'rgba(255, 255, 255, 0.15)';
    const zeroLineColor = 'rgba(255, 255, 255, 0.5)';
    const minorGridColor = 'rgba(255, 255, 255, 0.08)';
    const gridColorCallback = (context) => {
        if (context.tick.value === 0) return zeroLineColor;
        if (context.tick.type === 'minor') return minorGridColor;
        return gridColor;
    };
    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: {
                top: 40,
                right: 42
            }
        },
        plugins: {
            title: { display: true, text: title, font: { size: 18 }, color: textColor, padding: { bottom: 10 } },
            legend: { display: false },
            tooltip: { enabled: false }
        },
        scales: {
            x: {
                position: 'bottom',
                type: 'linear',
                title: { display: false },
                ticks: { color: textColor, padding: 10, minor: { display: true } },
                grid: { color: gridColorCallback, lineWidth: context => (context.tick.value === 0 ? 2 : 1), drawTicks: false }
            },
            y: {
                title: { display: false },
                ticks: { color: textColor, padding: 10 },
                grid: { color: gridColorCallback, lineWidth: context => (context.tick.value === 0 ? 2 : 1), drawTicks: false }
            }
        }
    };
}

function initialize() {
    const vMax = parseFloat(vMaxInput.value);
    const tMax = parseFloat(tMaxInput.value);
    const numPoints = parseInt(nbPointsSelect.value, 10);
    simTimeSlider.max = tMax;

    const timeSlots = new Set([0]);
    while (timeSlots.size < numPoints) {
        const randomTime = 1 + Math.random() * (tMax - 2);
        timeSlots.add(Math.round(randomTime));
    }
    const sortedTimes = Array.from(timeSlots).sort((a, b) => a - b);
    const initialData = sortedTimes.map(time => ({ x: time, y: Math.round(Math.random() * 2 * vMax - vMax) }));

    if (velocityChart) [velocityChart, positionChart, accelerationChart, simulationChart].forEach(c => c.destroy());

    const timeAxisOptions = { min: 0, max: tMax, ticks: { color: '#ecf0f1' } };
    const velocityOptions = createChartOptions('Vitesse en fonction du temps');
    velocityOptions.scales.x = { ...velocityOptions.scales.x, ...timeAxisOptions };
    velocityOptions.scales.y = { ...velocityOptions.scales.y, min: -vMax, max: vMax, ticks: { color: '#ecf0f1', padding: 10 } };

    velocityOptions.onHover = (event, elements) => {
        analyzerState.hoveredVelocityPointIndex = elements.length ? elements[0].index : null;
        event.chart.draw();
    };

    velocityOptions.plugins.dragData = {
        dragX: true,
        onDragStart: (e, datasetIndex, index, value) => {
            clearAllInteractions();
            analyzerState.isDragging = true;
            analyzerState.draggedPointIndex = index;
            analyzerState.hoveredVelocityPointIndex = null;

            const stepX = parseFloat(dragStepXInput.value) || 0.5;
            const stepY = parseFloat(dragStepYInput.value) || 0.5;
            const snappedX = Math.round(value.x / stepX) * stepX;
            const snappedY = Math.round(value.y / stepY) * stepY;

            analyzerState.draggedPointCoords = {
                x: parseFloat(snappedX.toFixed(2)),
                y: parseFloat(snappedY.toFixed(2))
            };
        },
        onDrag: (e, datasetIndex, index, value) => {
            const chart = e.chart;
            const tMax = chart.options.scales.x.max;
            const vMax = chart.options.scales.y.max;
            const data = chart.data.datasets[datasetIndex].data;

            const stepX = parseFloat(dragStepXInput.value) || 0.5;
            const stepY = parseFloat(dragStepYInput.value) || 0.5;

            let snappedX = Math.round(value.x / stepX) * stepX;
            let snappedY = Math.round(value.y / stepY) * stepY;

            const prevX = data[index - 1] ? data[index - 1].x : -Infinity;
            const nextX = data[index + 1] ? data[index + 1].x : Infinity;

            snappedX = Math.max(prevX + stepX, Math.min(snappedX, nextX - stepX));

            value.x = Math.max(0, Math.min(snappedX, tMax));

            if (index === 0) {
                value.x = 0;
            }

            value.y = Math.max(-vMax, Math.min(snappedY, vMax));

            value.x = parseFloat(value.x.toFixed(2));
            value.y = parseFloat(value.y.toFixed(2));

            analyzerState.draggedPointCoords = { x: value.x, y: value.y };

            chart.update('drag');
            return true;
        },
        onDragEnd: (e) => {
            analyzerState.isDragging = false;
            analyzerState.draggedPointIndex = null;
            velocityChart.data.datasets[0].data.sort((a, b) => a.x - b.x);
            updateAllCharts(false);
        }
    };

    const positionOptions = createChartOptions('Position en fonction du temps');
    positionOptions.scales.x = { ...positionOptions.scales.x, ...timeAxisOptions };
    const accelerationOptions = createChartOptions('Accélération en fonction du temps');
    accelerationOptions.scales.x = { ...accelerationOptions.scales.x, ...timeAxisOptions };

    velocityChart = new Chart('velocity-chart', { type: 'line', data: { datasets: [{ data: initialData, borderColor: '#3498db', borderWidth: 3, fill: false, pointRadius: 7, pointHoverRadius: 10, pointBackgroundColor: '#3498db' }] }, plugins: [axisArrowsPlugin, analyzerPlugin], options: velocityOptions });
    positionChart = new Chart('position-chart', { type: 'line', data: { datasets: [{ borderColor: '#2ecc71', borderWidth: 2.5, pointRadius: 0 }] }, plugins: [axisArrowsPlugin, analyzerPlugin], options: positionOptions });
    accelerationChart = new Chart('acceleration-chart', { type: 'line', data: { datasets: [{ stepped: true, borderColor: '#e74c3c', borderWidth: 2.5, fill: true, backgroundColor: 'rgba(231, 76, 60, 0.4)', pointRadius: 0 }] }, plugins: [axisArrowsPlugin, analyzerPlugin], options: accelerationOptions });

    const simulationOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'linear', position: 'bottom', title: { display: false }, ticks: { color: '#ecf0f1', minor: { display: true } }, grid: { color: 'rgba(255,255,255,0.15)', borderColor: '#ecf0f1' } }, y: { display: false, min: -1, max: 1 } }, plugins: { legend: { display: false }, tooltip: { enabled: false }, annotation: { annotations: { velVector: { type: 'line', borderColor: getComputedStyle(document.documentElement).getPropertyValue('--accent-red'), borderWidth: 3, arrowHeads: { end: { display: true, width: 6, length: 8, fill: true } }, drawTime: 'beforeDatasetsDraw' }, accelVector: { type: 'line', borderColor: getComputedStyle(document.documentElement).getPropertyValue('--accent-green'), borderWidth: 3, arrowHeads: { end: { display: true, width: 6, length: 8, fill: true } }, drawTime: 'beforeDatasetsDraw' } } } } };
    simulationChart = new Chart('simulation-chart', { type: 'scatter', data: { datasets: [{ data: [{ x: 0, y: 0 }], pointRadius: 10, pointHoverRadius: 10, backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--accent-blue') }] }, options: simulationOptions });

    setupAnalyzerEvents();
    updateAllCharts('normal');
}
function clearAllInteractions() { analyzerState.tangentActive = false; analyzerState.velocityAreaClickState = 'idle'; analyzerState.accelerationAreaClickState = 'idle';[velocityChart, positionChart, accelerationChart].forEach(c => c.update('none')); }
function setupAnalyzerEvents() { const posCanvas = positionChart.canvas; const velCanvas = velocityChart.canvas; const accelCanvas = accelerationChart.canvas; posCanvas.addEventListener('mousedown', (e) => { clearAllInteractions(); analyzerState.tangentActive = true; const rect = posCanvas.getBoundingClientRect(); const time = positionChart.scales.x.getValueForPixel(e.clientX - rect.left); if (time < positionChart.scales.x.min || time > positionChart.scales.x.max) { clearAllInteractions(); return; } const curveT = kinematicData.positionCurve.t; let i = curveT.findIndex(t => t >= time); if (i === -1) i = curveT.length - 1; analyzerState.tangentTime = curveT[i] || time; analyzerState.tangentPosition = getPositionAtTime(analyzerState.tangentTime); analyzerState.tangentVelocity = getVelocityAtTime(analyzerState.tangentTime);[velocityChart, positionChart, accelerationChart].forEach(c => c.update('none')); }); posCanvas.addEventListener('mousemove', (e) => { if (analyzerState.tangentActive) { const rect = posCanvas.getBoundingClientRect(); const time = positionChart.scales.x.getValueForPixel(e.clientX - rect.left); if (time < positionChart.scales.x.min || time > positionChart.scales.x.max) { clearAllInteractions(); return; } const curveT = kinematicData.positionCurve.t; let i = curveT.findIndex(t => t >= time); if (i === -1) i = curveT.length - 1; analyzerState.tangentTime = curveT[i] || time; analyzerState.tangentPosition = getPositionAtTime(analyzerState.tangentTime); analyzerState.tangentVelocity = getVelocityAtTime(analyzerState.tangentTime);[velocityChart, positionChart, accelerationChart].forEach(c => c.update('none')); } }); posCanvas.addEventListener('mouseup', clearAllInteractions); posCanvas.addEventListener('mouseleave', clearAllInteractions); velCanvas.addEventListener('click', (e) => { if (analyzerState.tangentActive || analyzerState.accelerationAreaClickState !== 'idle') { clearAllInteractions(); } const rect = velCanvas.getBoundingClientRect(); const time = velocityChart.scales.x.getValueForPixel(e.clientX - rect.left); if (time < velocityChart.scales.x.min || time > velocityChart.scales.x.max) { clearAllInteractions(); return; } switch (analyzerState.velocityAreaClickState) { case 'idle': analyzerState.velocityAreaClickState = 'first_click_done'; analyzerState.velocityAreaT1 = time; break; case 'first_click_done': analyzerState.velocityAreaClickState = 'second_click_done'; analyzerState.velocityAreaT2 = time; break; case 'second_click_done': clearAllInteractions(); return; }[velocityChart, positionChart, accelerationChart].forEach(c => c.update('none')); }); accelCanvas.addEventListener('click', (e) => { if (analyzerState.tangentActive || analyzerState.velocityAreaClickState !== 'idle') { clearAllInteractions(); } const rect = accelCanvas.getBoundingClientRect(); const time = accelerationChart.scales.x.getValueForPixel(e.clientX - rect.left); if (time < accelerationChart.scales.x.min || time > accelerationChart.scales.x.max) { clearAllInteractions(); return; } switch (analyzerState.accelerationAreaClickState) { case 'idle': analyzerState.accelerationAreaClickState = 'first_click_done'; analyzerState.accelerationAreaT1 = time; break; case 'first_click_done': analyzerState.accelerationAreaClickState = 'second_click_done'; analyzerState.accelerationAreaT2 = time; break; case 'second_click_done': clearAllInteractions(); return; }[velocityChart, positionChart, accelerationChart].forEach(c => c.update('none')); }); playBtn.addEventListener('click', startSimulation); stopBtn.addEventListener('click', () => { if (simState.isRunning) { stopSimulation(); } else { resetSimulation(); } }); simTimeSlider.addEventListener('input', () => { simState.currentTime = parseFloat(simTimeSlider.value); stopSimulation(); updateSimulationChart(); }); simSpeedSlider.addEventListener('input', (e) => { simSpeedReadout.value = `${parseFloat(e.target.value).toFixed(2)}x`; }); showVelVectorCheckbox.addEventListener('change', updateSimulationChart); showAccelVectorCheckbox.addEventListener('change', updateSimulationChart); nbPointsSelect.addEventListener('change', initialize); tMaxInput.addEventListener('change', () => updateAllCharts('normal')); vMaxInput.addEventListener('change', () => updateAllCharts('normal')); x0Input.addEventListener('change', () => updateAllCharts('none')); dragStepXInput.addEventListener('change', () => updateAllCharts('normal')); dragStepYInput.addEventListener('change', () => updateAllCharts('normal')); window.addEventListener('load', initialize); }

function startSimulation() {
    if (simState.isRunning) return;
    // --- MODIFIÉ 2 : Logique de réinitialisation de la simulation ---
    // Si la simulation a atteint la fin du mouvement, la réinitialise à 0 avant de la relancer.
    if (simState.isPaused && simState.currentTime >= simState.t_end_motion - 1e-9) {
        simState.currentTime = 0;
    }
    // --- FIN DE LA MODIFICATION 2 ---
    simState.isRunning = true;
    simState.isPaused = false;
    stopBtn.innerHTML = stopIconSVG;
    stopBtn.title = 'Arrêter';
    simState.lastTimestamp = performance.now();
    simState.animationFrameId = requestAnimationFrame(animateSimulation);
}

function stopSimulation() {
    simState.isRunning = false;
    simState.isPaused = true;
    if (simState.animationFrameId) cancelAnimationFrame(simState.animationFrameId);
    stopBtn.innerHTML = resetIconSVG;
    stopBtn.title = 'Réinitialiser';
    updateSimulationChart();
}

function resetSimulation() {
    if (simState.isRunning) {
        if (simState.animationFrameId) cancelAnimationFrame(simState.animationFrameId);
    }
    simState.isRunning = false;
    simState.isPaused = false;
    simState.currentTime = 0;
    stopBtn.innerHTML = stopIconSVG;
    stopBtn.title = 'Arrêter';
    updateSimulationChart();
}

function animateSimulation(timestamp) {
    if (!simState.isRunning) return;
    const playbackSpeed = parseFloat(simSpeedSlider.value);
    const deltaTime = (timestamp - simState.lastTimestamp) / 1000 * playbackSpeed;
    simState.lastTimestamp = timestamp;
    simState.currentTime += deltaTime;

    // --- MODIFIÉ 3 : Condition d'arrêt de l'animation ---
    // L'animation s'arrête lorsqu'elle atteint le temps de fin du mouvement réel.
    if (simState.currentTime >= simState.t_end_motion) {
        simState.currentTime = simState.t_end_motion;
        stopSimulation();
    }
    // --- FIN DE LA MODIFICATION 3 ---

    updateSimulationChart();
    if (simState.isRunning) simState.animationFrameId = requestAnimationFrame(animateSimulation);
}

function updateSimulationChart() {
    const time = simState.currentTime;
    simTimeSlider.value = time;
    if (!simulationChart || !positionChart) return;
    const { x, v, a } = getKinematicsAtTime(time);
    readoutTime.innerHTML = `${time.toFixed(2)}&nbsp;s`;
    readoutPos.innerHTML = `<strong>${x.toFixed(2)}&nbsp;m</strong>`;
    readoutVel.innerHTML = `<strong>${v.toFixed(2)}&nbsp;m/s</strong>`;
    readoutAccel.innerHTML = `${a.toFixed(2)}&nbsp;m/s²`;
    simulationChart.data.datasets[0].data[0] = { x: x, y: 0 };
    const totalRange = simulationChart.options.scales.x.max - simulationChart.options.scales.x.min;
    const maxVectorLength = totalRange * 0.20;
    const velVector = simulationChart.options.plugins.annotation.annotations.velVector;
    velVector.display = (simState.currentTime > 1e-9) && showVelVectorCheckbox.checked && (simState.v_max > 1e-3);
    if (velVector.display) {
        const v_length = (v / simState.v_max) * maxVectorLength;
        velVector.xMin = x;
        velVector.xMax = x + v_length;
        velVector.yMin = 0.1;
        velVector.yMax = 0.1;
    }
    const accelVector = simulationChart.options.plugins.annotation.annotations.accelVector;
    accelVector.display = (simState.currentTime > 1e-9) && showAccelVectorCheckbox.checked && (simState.a_max > 1e-3);
    if (accelVector.display) {
        const a_length = (a / simState.a_max) * maxVectorLength;
        accelVector.xMin = x;
        accelVector.xMax = x + a_length;
        accelVector.yMin = -0.1;
        accelVector.yMax = -0.1;
    }
    simulationChart.update('none');
}

// --- NARRATIVE ---
function updateNarrative() {
    const analysis = performFullAnalysis();
    const { t_points, v_points, accelerations } = kinematicData;
    if (!analysis || t_points.length < 2) {
        narrativeTextDiv.innerHTML = "";
        return;
    }

    let narrative = [];
    let loopStartIndex = 0;

    const max_speed_magnitude = Math.max(Math.abs(analysis.velocity.max?.val || 0), Math.abs(analysis.velocity.min?.val || 0));
    const farthest_pos_magnitude = Math.max(Math.abs(analysis.position.max?.val || 0), Math.abs(analysis.position.min?.val || 0));
    let farthest_point_mentioned = false;
    let max_speed_mentioned = false;

    // --- Initial State ---
    const x0 = getPositionAtTime(t_points[0]);
    const v0 = v_points[0];
    const a0 = accelerations[0];
    const duration0 = t_points[1] - t_points[0];

    let pos_narrative = Math.abs(x0) < 1e-9 ? "se situe à l'origine" : `se situe à une position <strong>de ${x0.toFixed(2)}&nbsp;m</strong>`;
    if (farthest_pos_magnitude > 1e-9 && Math.abs(Math.abs(x0) - farthest_pos_magnitude) < 1e-3) {
        pos_narrative += ", ce qui est son point le plus éloigné de l'origine durant ce parcours";
        farthest_point_mentioned = true;
    }

    // Case 1: First segment has constant velocity (a0 is zero).
    if (Math.abs(a0) < 1e-9) {
        loopStartIndex = 1;
        let initial_sentence = "";

        // Case 1a: At rest for the first segment.
        if (Math.abs(v0) < 1e-9) {
            initial_sentence = `Au départ, la particule ${pos_narrative} et part du repos. Elle restera immobile pendant <strong>${duration0.toFixed(1)}&nbsp;s</strong>.`;
        }
        // Case 1b: Constant non-zero speed for the first segment.
        else {
            const direction = v0 > 0 ? "la droite" : "la gauche";
            initial_sentence = `Au départ, la particule ${pos_narrative} avec un module de vitesse de <strong>${Math.abs(v0).toFixed(2)}&nbsp;m/s</strong>, en se dirigeant vers ${direction} à vitesse constante. Elle gardera cette vitesse pendant <strong>${duration0.toFixed(1)}&nbsp;s</strong>.`;

            if (!max_speed_mentioned && Math.abs(Math.abs(v0) - max_speed_magnitude) < 1e-3) {
                let sentence_without_period = initial_sentence.slice(0, -1);
                sentence_without_period += ", ce qui représente d'emblée son allure maximale du parcours.";
                initial_sentence = sentence_without_period;
                max_speed_mentioned = true;
            }
        }
        narrative.push(`<p>${initial_sentence}</p>`);
    }
    // Case 2: First segment has acceleration.
    else {
        loopStartIndex = 0;
        let vel_narrative = Math.abs(v0) < 1e-9 ? "et part du repos" : `avec un module de vitesse de <strong>${Math.abs(v0).toFixed(2)}&nbsp;m/s</strong>, en se dirigeant ${(v0 >= 0 ? "vers la droite" : "vers la gauche")}`;
        if (!max_speed_mentioned && Math.abs(Math.abs(v0) - max_speed_magnitude) < 1e-3) {
            vel_narrative += ", ce qui représente d'emblée son allure maximale du parcours";
            max_speed_mentioned = true;
        }
        narrative.push(`<p>Au départ, la particule ${pos_narrative} ${vel_narrative}.</p>`);
    }

    const phrasing = {
        transitions: ["Ensuite,", "Puis,", "Pour la phase suivante,", "Après cela,"],
        speedingUp: ["accélère", "gagne de la vitesse", "augmente sa vitesse"],
        slowingDown: ["ralentit", "décélère", "freine", "perd de la vitesse"],
        turnaround_part1: [
            "Poursuivant son chemin vers __INITIAL_DIR__, elle __VERB__ jusqu'à changer de direction à <strong>__TIME_CROSS__&nbsp;s</strong>.",
            "Une phase de décélération commence tout en continuant son mouvement vers __INITIAL_DIR__ jusqu'à <strong>__TIME_CROSS__&nbsp;s</strong>, pour finalement effectuer un demi-tour.",
            "La particule __VERB__ progressivement en se dirigeant vers __INITIAL_DIR__, pour finalement rebrousser chemin à <strong>__TIME_CROSS__&nbsp;s</strong>."
        ],
        turnaround_part2: [
            "Ensuite, elle repart en <strong>accélérant</strong> vers __NEW_DIR__, pour atteindre un module de vitesse de <strong>__END_SPEED__&nbsp;m/s</strong> à <strong>__END_TIME__&nbsp;s</strong>__SPEED_CONTEXT__.",
            "Elle entame une <strong>accélération</strong> en direction de __NEW_DIR__ pour arriver à un module de vitesse de <strong>__END_SPEED__&nbsp;m/s</strong> à <strong>__END_TIME__&nbsp;s</strong>__SPEED_CONTEXT__.",
            "À cet instant, le mouvement s'accélère en se déplaçant vers __NEW_DIR__ pour atteindre une grandeur de vitesse de <strong>__END_SPEED__&nbsp;m/s</strong> à <strong>__END_TIME__&nbsp;s</strong>__SPEED_CONTEXT__."
        ]
    };

    for (let i = loopStartIndex; i < accelerations.length; i++) {
        const a = accelerations[i];
        const t_start = t_points[i], t_end = t_points[i + 1];
        const v_start = getVelocityAtTime(t_start), v_end = getVelocityAtTime(t_end);
        if (Math.abs(t_end - t_start) < 1e-6) continue;

        let text = "";
        let speed_context = "";
        if (!max_speed_mentioned && Math.abs(v_end) > 1e-9 && Math.abs(Math.abs(v_end) - max_speed_magnitude) < 1e-3) {
            speed_context = ", soit le plus grand module de vitesse du parcours";
            max_speed_mentioned = true;
        }

        if (v_start * v_end < 0 && Math.abs(a) > 1e-9) {
            const t_cross = t_start - v_start / a;
            const pos_at_turn = getPositionAtTime(t_cross);
            const initial_direction = v_start > 0 ? "la droite" : "la gauche";
            const new_direction = v_end > 0 ? "la droite" : "la gauche";

            let pos_context = "";
            if (!farthest_point_mentioned && farthest_pos_magnitude > 1e-9 && Math.abs(farthest_pos_magnitude - Math.abs(pos_at_turn)) < 1e-3) {
                pos_context = ", ce qui constitue sa position la plus éloignée de l'origine";
                farthest_point_mentioned = true;
            }

            const verb = phrasing.slowingDown[i % phrasing.slowingDown.length];
            let part1 = phrasing.turnaround_part1[i % phrasing.turnaround_part1.length]
                .replace('__INITIAL_DIR__', initial_direction)
                .replace('__VERB__', `<strong>${verb}</strong>`)
                .replace('__TIME_CROSS__', t_cross.toFixed(1));

            let part2 = phrasing.turnaround_part2[i % phrasing.turnaround_part2.length]
                .replace('__NEW_DIR__', new_direction)
                .replace('__END_SPEED__', Math.abs(v_end).toFixed(2))
                .replace('__END_TIME__', t_end.toFixed(1))
                .replace('__SPEED_CONTEXT__', speed_context);

            text = `${part1} Sa position est alors de <strong>${pos_at_turn.toFixed(2)}&nbsp;m</strong>${pos_context}. ${part2}`;

        } else {
            const duration = t_end - t_start;

            if (Math.abs(a) < 1e-9) {
                if (Math.abs(v_start) < 1e-9) {
                    text = `De <strong>${t_start.toFixed(1)}&nbsp;s</strong> à <strong>${t_end.toFixed(1)}&nbsp;s</strong>, la particule reste immobile.`;
                } else {
                    const direction = v_start > 0 ? "la droite" : "la gauche";
                    text = `${phrasing.transitions[i % phrasing.transitions.length]} elle se déplace à une vitesse constante de <strong>${Math.abs(v_start).toFixed(2)}&nbsp;m/s</strong> vers ${direction} pendant ${duration.toFixed(1)}&nbsp;s.`;
                }
            }
            else {
                const direction = (Math.abs(v_start) > 1e-9) ? (v_start > 0 ? "la droite" : "la gauche") : (a > 0 ? "la droite" : "la gauche");
                const directionText = ` vers ${direction}`;

                const startsFromRest = Math.abs(v_start) < 1e-9 && Math.abs(a) > 1e-9;
                const isSlowingDown = a * v_start < -1e-9;
                const isSpeedingUp = a * v_start > 1e-9 || startsFromRest;

                const verb = isSpeedingUp ? phrasing.speedingUp[i % phrasing.speedingUp.length] : phrasing.slowingDown[i % phrasing.slowingDown.length];
                const transition = i > 0 ? phrasing.transitions[i % phrasing.transitions.length] : "À partir de ce moment,";
                const endClause = Math.abs(v_end) < 1e-9 ? "pour finalement s'arrêter" : `pour atteindre un module de vitesse de <strong>${Math.abs(v_end).toFixed(2)}&nbsp;m/s</strong>`;
                text = `${transition} elle <strong>${verb}</strong> pendant ${duration.toFixed(1)}&nbsp;s en se déplaçant${directionText}, ${endClause} à <strong>${t_end.toFixed(1)}&nbsp;s</strong>${speed_context}.`;
            }
        }
        if (text) {
            narrative.push(`<p>${text}</p>`);
        }
    }

    if (!farthest_point_mentioned && farthest_pos_magnitude > 1e-9) {
        const { max: maxPos, min: minPos } = analysis.position;
        const t_max_total = t_points[t_points.length - 1];
        let farthestPoint = null;
        if (maxPos && (!minPos || Math.abs(maxPos.val) >= Math.abs(minPos.val))) {
            farthestPoint = maxPos;
        } else if (minPos) {
            farthestPoint = minPos;
        }
        if (farthestPoint && Math.abs(farthestPoint.t - t_max_total) < 1e-3) {
            narrative.push(`<p>Le mouvement se termine alors que la particule atteint la position   ${farthestPoint.val.toFixed(2)}&nbsp;m</strong>, ce qui représente sa position la plus distante de l'origine.</p>`);
        }
    }
    if (!max_speed_mentioned && max_speed_magnitude > 1e-9) {
        const { max: max_v_data, min: min_v_data } = analysis.velocity;
        let max_speed_event;
        if (max_v_data && (!min_v_data || max_v_data.val >= Math.abs(min_v_data.val))) {
            max_speed_event = max_v_data;
        } else {
            max_speed_event = min_v_data;
        }
        if (max_speed_event) {
            const timePoints = max_speed_event.times.map(t => t.toFixed(1) + '&nbsp;s').join(' et ');
            narrative.push(`<p>À noter que le module de vitesse maximal, <strong>${Math.abs(max_speed_event.val).toFixed(2)}&nbsp;m/s</strong>, est atteint à <strong>${timePoints}</strong>.</p>`);
        }
    }

    narrativeTextDiv.innerHTML = narrative.join('');
}

// --- Formatting Helper Functions ---
function formatResult(value, formatter, ...args) { const formattedValue = formatter(value, ...args); return formattedValue === 'Aucun' ? `<span class="analysis-none">Aucun</span>` : formattedValue; }
function _formatDistance(distance) { if (distance === null || typeof distance === 'undefined') return 'Aucun'; return `<strong>${distance.toFixed(2)}&nbsp;m</strong>`; }

function _formatIntervals(intervals, valueType) {
    if (!intervals || intervals.length === 0) return 'Aucun';
    const t_start_total = kinematicData.t_points[0];
    const t_end_total = kinematicData.t_points[kinematicData.t_points.length - 1];
    const internal_discontinuity_points = kinematicData.t_points.slice(1, -1);
    return intervals.map(iv => {
        const t1 = iv[0];
        const t2 = iv[1];
        let startBracket = '[';
        let endBracket = ']';
        const v1_is_zero = Math.abs(getVelocityAtTime(t1)) < 1e-9;
        const v2_is_zero = Math.abs(getVelocityAtTime(t2)) < 1e-9;
        if (valueType === 'acceleration' || valueType === 'combined') {
            const t1_is_discontinuous = internal_discontinuity_points.some(p => Math.abs(p - t1) < 1e-9);
            const t2_is_discontinuous = internal_discontinuity_points.some(p => Math.abs(p - t2) < 1e-9);
            if (valueType === 'acceleration') {
                if (t1 > t_start_total && t1_is_discontinuous) startBracket = ']';
                if (t2 < t_end_total && t2_is_discontinuous) endBracket = '[';
            } else {
                if ((t1 > t_start_total && t1_is_discontinuous) || v1_is_zero) startBracket = ']';
                if ((t2 < t_end_total && t2_is_discontinuous) || v2_is_zero) endBracket = '[';
            }
        } else {
            if (v1_is_zero) startBracket = ']';
            if (v2_is_zero) endBracket = '[';
        }
        return `${startBracket}${t1.toFixed(1)}, ${t2.toFixed(1)}${endBracket}&nbsp;s`;
    }).join(', ');
}

function _formatPoints(points) { if (!points || points.length === 0) return 'Aucun'; return points.sort((a, b) => a - b).map(p => `${p.toFixed(1)}&nbsp;s`).join(', '); }
function _formatExtremum(extremum) { if (!extremum) return 'Aucun'; return `<strong>${extremum.val.toFixed(2)}&nbsp;m</strong> à ${extremum.t.toFixed(1)}&nbsp;s`; }
function _formatSpeed(speedData) { if (!speedData) return 'Aucun'; const valStr = `<strong>${speedData.val.toFixed(2)}&nbsp;m/s</strong>`; const timesStr = speedData.times.map(t => t.toFixed(1) + '&nbsp;s').join(', '); return `${valStr} à ${timesStr}`; }

function _formatZeroVelocity(data) {
    const { points, intervals } = data;
    if ((!points || points.length === 0) && (!intervals || intervals.length === 0)) {
        return 'Aucun';
    }
    const formattedIntervals = intervals.map(iv => {
        return `[${iv[0].toFixed(1)}, ${iv[1].toFixed(1)}]&nbsp;s`;
    });
    const standalonePoints = points.filter(p => !intervals.some(iv => p >= iv[0] - 1e-9 && p <= iv[1] + 1e-9)).map(p => `${p.toFixed(1)}&nbsp;s`);
    const allParts = [...standalonePoints, ...formattedIntervals].sort((a, b) => parseFloat(a.replace(/\[|\]|s/g, '').trim()) - parseFloat(b.replace(/\[|\]|s/g, '').trim()));
    return allParts.join(', ');
}

// --- ANALYSIS ---
function updateAnalysis() {
    const analysis = performFullAnalysis();
    let html = `
                <h4>Informations générales</h4>
                <div class="analysis-item"><span class="analysis-label">Distance totale parcourue</span><span class="analysis-value">${formatResult(analysis.summary.totalDistance, _formatDistance)}</span></div>
                <div class="analysis-item"><span class="analysis-label">Déplacement total</span><span class="analysis-value">${formatResult(analysis.summary.totalDisplacement, _formatDistance)}</span></div>
                <div class="analysis-item"><span class="analysis-label">Position la plus positive</span><span class="analysis-value">${formatResult(analysis.position.max, _formatExtremum)}</span></div>
                <div class="analysis-item"><span class="analysis-label">Position la plus négative</span><span class="analysis-value">${formatResult(analysis.position.min, _formatExtremum)}</span></div>
                <div class="analysis-item"><span class="analysis-label">Vitesse maximale positive</span><span class="analysis-value">${formatResult(analysis.velocity.max, _formatSpeed)}</span></div>
                <div class="analysis-item"><span class="analysis-label">Vitesse maximale négative</span><span class="analysis-value">${formatResult(analysis.velocity.min, _formatSpeed)}</span></div>

                <h4>Instant(s) ou Intervalle(s) où</h4>
                <div class="analysis-item"><span class="analysis-label">La position est nulle</span><span class="analysis-value">${formatResult(analysis.position.zeros, _formatPoints)}</span></div>
                <div class="analysis-item"><span class="analysis-label">La vitesse est nulle</span><span class="analysis-value">${formatResult({ points: analysis.velocity.zeros, intervals: analysis.velocity.zeroIntervals }, _formatZeroVelocity)}</span></div>
                <div class="analysis-item"><span class="analysis-label">L'accélération est nulle (vitesse est constante)</span><span class="analysis-value">${formatResult(analysis.acceleration.zeroIntervals, _formatIntervals, 'acceleration')}</span></div>
                <div class="analysis-item"><span class="analysis-label">Le mouvement change de direction</span><span class="analysis-value">${formatResult(analysis.position.directionChangePoints, _formatPoints)}</span></div>
                <div class="analysis-item"><span class="analysis-label">La position est positive</span><span class="analysis-value">${formatResult(analysis.position.positiveIntervals, _formatIntervals, 'position')}</span></div>
                <div class="analysis-item"><span class="analysis-label">La position est négative</span><span class="analysis-value">${formatResult(analysis.position.negativeIntervals, _formatIntervals, 'position')}</span></div>
                <div class="analysis-item"><span class="analysis-label">La vitesse est positive</span><span class="analysis-value">${formatResult(analysis.velocity.positiveIntervals, _formatIntervals, 'velocity')}</span></div>
                <div class="analysis-item"><span class="analysis-label">La vitesse est négative</span><span class="analysis-value">${formatResult(analysis.velocity.negativeIntervals, _formatIntervals, 'velocity')}</span></div>
                <div class="analysis-item"><span class="analysis-label">L'accélération est positive</span><span class="analysis-value">${formatResult(analysis.acceleration.positiveIntervals, _formatIntervals, 'acceleration')}</span></div>
                <div class="analysis-item"><span class="analysis-label">L'accélération est négative</span><span class="analysis-value">${formatResult(analysis.acceleration.negativeIntervals, _formatIntervals, 'acceleration')}</span></div>
                <div class="analysis-item"><span class="analysis-label">La vitesse augmente en module</span><span class="analysis-value">${formatResult(analysis.combined.speedingUp, _formatIntervals, 'combined')}</span></div>
                <div class="analysis-item"><span class="analysis-label">La particule freine</span><span class="analysis-value">${formatResult(analysis.combined.slowingDown, _formatIntervals, 'combined')}</span></div>
            `;
    analysisContentDiv.innerHTML = html;
}

// =================================================================
//                 *** FONCTION D'ANALYSE CORRIGÉE ***
// =================================================================
function performFullAnalysis() {
    const { t_points, v_points, accelerations, positionCurve, segmentStartPositions } = kinematicData;
    const analysis = { position: { max: null, min: null, zeros: [], positiveIntervals: [], negativeIntervals: [], directionChangePoints: [] }, velocity: { max: null, min: null, zeros: [], positiveIntervals: [], negativeIntervals: [], zeroIntervals: [] }, acceleration: { positiveIntervals: [], negativeIntervals: [], zeroIntervals: [] }, combined: { speedingUp: [], slowingDown: [] }, summary: { totalDistance: 0, totalDisplacement: 0 } };
    if (t_points.length < 2) return analysis;

    // --- Position Extrema (Max/Min) ---
    let maxPos = { t: positionCurve.t[0], val: positionCurve.x[0] };
    let minPos = { t: positionCurve.t[0], val: positionCurve.x[0] };
    if (positionCurve.t.length > 0) {
        for (let i = 1; i < positionCurve.t.length; i++) {
            if (positionCurve.x[i] > maxPos.val) maxPos = { t: positionCurve.t[i], val: positionCurve.x[i] };
            if (positionCurve.x[i] < minPos.val) minPos = { t: positionCurve.t[i], val: positionCurve.x[i] };
        }
        if (maxPos.val > 1e-9) analysis.position.max = maxPos;
        if (minPos.val < -1e-9) analysis.position.min = minPos;
    }


    // --- Summary Calculations ---
    analysis.summary.totalDistance = calculateDistance(t_points[0], t_points[t_points.length - 1]);
    const x_start_total = getPositionAtTime(t_points[0]);
    const x_end_total = getPositionAtTime(t_points[t_points.length - 1]);
    analysis.summary.totalDisplacement = x_end_total - x_start_total;

    // --- Velocity Extrema ---
    const max_v_val = Math.max(...v_points);
    const min_v_val = Math.min(...v_points);
    if (max_v_val > 1e-9) {
        const max_v_times = t_points.filter((t, i) => Math.abs(v_points[i] - max_v_val) < 1e-9);
        analysis.velocity.max = { val: max_v_val, times: [...new Set(max_v_times)] };
    }
    if (min_v_val < -1e-9) {
        const min_v_times = t_points.filter((t, i) => Math.abs(v_points[i] - min_v_val) < 1e-9);
        analysis.velocity.min = { val: min_v_val, times: [...new Set(min_v_times)] };
    }

    // --- Position Zeros (Analytical Method) ---
    analysis.position.zeros = [];
    if (Math.abs(segmentStartPositions[0]) < 1e-9) {
        analysis.position.zeros.push(t_points[0]);
    }
    for (let i = 0; i < accelerations.length; i++) {
        const t_start = t_points[i];
        const t_end = t_points[i + 1];
        const x_start = segmentStartPositions[i];
        const v_start = v_points[i];
        const a = accelerations[i];

        if (Math.abs(a) < 1e-9) { // Constant velocity
            if (Math.abs(v_start) > 1e-9) {
                const dt = -x_start / v_start;
                const t_cross = t_start + dt;
                if (t_cross > t_start && t_cross <= t_end) {
                    analysis.position.zeros.push(t_cross);
                }
            }
        } else { // Constant acceleration (quadratic)
            const discriminant = v_start * v_start - 2 * a * x_start;
            if (discriminant >= 0) {
                const sqrt_discriminant = Math.sqrt(discriminant);
                const dt1 = (-v_start + sqrt_discriminant) / a;
                const dt2 = (-v_start - sqrt_discriminant) / a;
                const t_cross1 = t_start + dt1;
                const t_cross2 = t_start + dt2;

                if (t_cross1 > t_start + 1e-9 && t_cross1 <= t_end) {
                    analysis.position.zeros.push(t_cross1);
                }
                if (Math.abs(discriminant) > 1e-9) {
                    if (t_cross2 > t_start + 1e-9 && t_cross2 <= t_end) {
                        analysis.position.zeros.push(t_cross2);
                    }
                }
            }
        }
    }


    // --- Event-based Interval Analysis ---
    const eventTimes = new Set(t_points);
    analysis.position.zeros.forEach(t => eventTimes.add(t));
    for (let i = 0; i < accelerations.length; i++) {
        if (v_points[i] * v_points[i + 1] < 0 && Math.abs(accelerations[i]) > 1e-9) {
            const t_cross = t_points[i] - v_points[i] / accelerations[i];
            eventTimes.add(t_cross);
        }
    }
    const sortedEvents = Array.from(eventTimes).sort((a, b) => a - b).filter((t, i, arr) => i === 0 || Math.abs(t - arr[i - 1]) > 1e-9);

    for (let i = 0; i < sortedEvents.length - 1; i++) {
        const t1 = sortedEvents[i], t2 = sortedEvents[i + 1];
        if (Math.abs(t1 - t2) < 1e-9) continue;
        const t_mid = (t1 + t2) / 2;
        const { x, v, a } = getKinematicsAtTime(t_mid);

        if (x > 1e-9) analysis.position.positiveIntervals.push([t1, t2]);
        else if (x < -1e-9) analysis.position.negativeIntervals.push([t1, t2]);

        if (v > 1e-9) analysis.velocity.positiveIntervals.push([t1, t2]);
        else if (v < -1e-9) analysis.velocity.negativeIntervals.push([t1, t2]);
        else analysis.velocity.zeroIntervals.push([t1, t2]);

        if (a > 1e-9) analysis.acceleration.positiveIntervals.push([t1, t2]);
        else if (a < -1e-9) analysis.acceleration.negativeIntervals.push([t1, t2]);
        else analysis.acceleration.zeroIntervals.push([t1, t2]);
        if (v * a > 1e-9) analysis.combined.speedingUp.push([t1, t2]);
        else if (v * a < -1e-9) analysis.combined.slowingDown.push([t1, t2]);
    }

    const merge = (intervals) => intervals.sort((a, b) => a[0] - b[0]).reduce((acc, current) => { if (acc.length > 0 && Math.abs(acc[acc.length - 1][1] - current[0]) < 1e-9) { acc[acc.length - 1][1] = Math.max(acc[acc.length - 1][1], current[1]); } else { acc.push([...current]); } return acc; }, []);

    analysis.velocity.zeros = Array.from(eventTimes).filter(t => Math.abs(getVelocityAtTime(t)) < 1e-9);

    analysis.position.positiveIntervals = merge(analysis.position.positiveIntervals);
    analysis.position.negativeIntervals = merge(analysis.position.negativeIntervals);
    analysis.velocity.positiveIntervals = merge(analysis.velocity.positiveIntervals);
    analysis.velocity.negativeIntervals = merge(analysis.velocity.negativeIntervals);
    analysis.velocity.zeroIntervals = merge(analysis.velocity.zeroIntervals);
    analysis.acceleration.positiveIntervals = merge(analysis.acceleration.positiveIntervals);
    analysis.acceleration.negativeIntervals = merge(analysis.acceleration.negativeIntervals);
    analysis.acceleration.zeroIntervals = merge(analysis.acceleration.zeroIntervals);
    analysis.combined.speedingUp = merge(analysis.combined.speedingUp);
    analysis.combined.slowingDown = merge(analysis.combined.slowingDown);

    // --- DÉTECTION DES CHANGEMENTS DE DIRECTION (Logique corrigée et robuste) ---
    const changePoints = new Set();
    const epsilon = 1e-9;

    for (let i = 0; i < t_points.length - 1; i++) {
        const v_start = v_points[i];
        const v_end = v_points[i + 1];
        const t_start = t_points[i];
        const a = accelerations[i];

        // Cas 1: Traversée simple de l'axe (la vitesse change de signe dans le segment)
        if (v_start * v_end < -epsilon) {
            const t_cross = t_start - v_start / a;
            changePoints.add(t_cross);
        }
        // Cas 2: La particule s'arrête (v_end = 0) et pourrait repartir dans l'autre sens
        else if (Math.abs(v_end) < epsilon && Math.abs(v_start) > epsilon) {
            // Trouver le prochain segment où le mouvement reprend
            let next_v = 0;
            let restart_time = t_points[i + 1];
            for (let j = i + 1; j < v_points.length; j++) {
                if (Math.abs(v_points[j]) > epsilon) {
                    next_v = v_points[j];
                    restart_time = t_points[j - 1]; // Le changement a lieu à la fin de la période de repos
                    break;
                }
            }
            // Si la vitesse de départ et la vitesse de reprise sont de signes opposés
            if (v_start * next_v < -epsilon) {
                changePoints.add(restart_time);
            }
        }
    }

    analysis.position.directionChangePoints = Array.from(changePoints).sort((a, b) => a - b);
    analysis.position.zeros = [...new Set(analysis.position.zeros.map(z => Number(z.toFixed(3))))].sort((a, b) => a - b);

    return analysis;
}

window.addEventListener('load', initialize);