const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

const Illustration = sequelize.define(
  "Illustration",
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    screenName: {
      type: DataTypes.ENUM(
        "login_with_ph_no",
        "otp_verification",
        "otp_verification_error",
        "otp_verification_done",
        "3_attempts_completed"
      ),
      allowNull: false,
    },
    img: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0, // 0 = unpublished, 1 = published, 2 = scheduled
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true, // Required only for status = 2 (scheduled)
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true, // Required for status = 2 (scheduled), optional for status = 1 (published)
    },
  },
  {
    tableName: "tbl_illustration",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = Illustration;