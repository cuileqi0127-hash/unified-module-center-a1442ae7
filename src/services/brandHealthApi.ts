/**
 * 品牌健康度报告 API（兼容层，实际实现见 reportApi）
 */
export {
  submitBrandHealthTask,
  getReportList,
  getReportTaskStatus,
  pollReportUntilReady,
  type BrandHealthTaskRequest,
  type ReportTaskResponse,
  type ReportTaskStatusResponse,
  type ReportListItem,
  type ReportListData,
} from './reportApi';
