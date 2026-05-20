import Report from "../models/Report.js";

export const ReportRepository = {
  list() {
    return Report.find().populate("user", "name role").sort({ createdAt: -1 });
  },
  findById(id) {
    return Report.findById(id).populate("user", "name role");
  },
  create(data) {
    return Report.create(data);
  },
  updateStatus(id, status) {
    return Report.findByIdAndUpdate(id, { status }, { new: true });
  },
};
