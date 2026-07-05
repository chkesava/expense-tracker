import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DailyLogSummary } from "../types/nutrition";

export const exportNutritionCSV = (logs: DailyLogSummary[]) => {
  const headers = ["Date", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Water (ml)", "Workout Duration (min)", "Workout Calories"];
  
  const rows = logs.map(log => [
    log.date,
    log.nutritionSummary?.calories || 0,
    log.nutritionSummary?.protein || 0,
    log.nutritionSummary?.carbs || 0,
    log.nutritionSummary?.fat || 0,
    log.waterLoggedMl || 0,
    log.workoutSummary?.durationMinutes || 0,
    log.workoutSummary?.caloriesBurned || 0,
  ]);

  const csvContent = [headers, ...rows]
    .map(e => e.join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `nutrition_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportNutritionPDF = (logs: DailyLogSummary[]) => {
  const doc = new jsPDF();
  
  // Brand Header
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129); // Emerald-500
  doc.text("Nutrition Tracker", 14, 22);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Performance Report: Last ${logs.length} Days`, 14, 30);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 36);

  const tableColumn = ["Date", "Cals", "Protein", "Carbs", "Fat", "Water (ml)", "Activity"];
  const tableRows: string[][] = [];

  logs.forEach(log => {
    const row = [
      log.date,
      Math.round(log.nutritionSummary?.calories || 0).toString(),
      `${Math.round(log.nutritionSummary?.protein || 0)}g`,
      `${Math.round(log.nutritionSummary?.carbs || 0)}g`,
      `${Math.round(log.nutritionSummary?.fat || 0)}g`,
      (log.waterLoggedMl || 0).toString(),
      `${log.workoutSummary?.durationMinutes || 0}m (${log.workoutSummary?.caloriesBurned || 0} kcal)`
    ];
    tableRows.push(row);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 45,
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129] }, // Emerald-500
    styles: { fontSize: 10, cellPadding: 3 },
  });

  doc.save(`nutrition_report_${new Date().toISOString().split('T')[0]}.pdf`);
};
