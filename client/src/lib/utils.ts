import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Reporting Period Types
export interface ReportingPeriod {
  periodNumber: number;
  startDate: string;
  endDate: string;
}

export interface ReportingData {
  periods: ReportingPeriod[];
  periodLength: string;
}

// Get the current reporting period based on today's date
export function getCurrentReportingPeriod(reportingData: ReportingData | null): ReportingPeriod | null {
  if (!reportingData || !reportingData.periods.length) {
    return null;
  }

  const today = new Date();
  return reportingData.periods.find(period => {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    return today >= start && today <= end;
  }) || null;
}

// Filter data points to only include those within a specific date range
export function filterDataPointsByDateRange<T extends { date: string }>(
  dataPoints: T[], 
  startDate: string, 
  endDate: string
): T[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return dataPoints.filter(dataPoint => {
    const dataDate = new Date(dataPoint.date);
    return dataDate >= start && dataDate <= end;
  });
}

// Filter data points to only include those within the current reporting period
export function filterDataPointsByCurrentPeriod<T extends { date: string }>(
  dataPoints: T[], 
  reportingData: ReportingData | null
): T[] {
  const currentPeriod = getCurrentReportingPeriod(reportingData);
  
  if (!currentPeriod) {
    // If no current period, return all data points (fallback behavior)
    return dataPoints;
  }
  
  return filterDataPointsByDateRange(dataPoints, currentPeriod.startDate, currentPeriod.endDate);
}
