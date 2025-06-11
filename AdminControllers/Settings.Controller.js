const Settings = require("../Models/Setting");
const uploadToS3 = require("../config/fileUpload.aws");


const UpsertSettings = async (req, res) => {
  try {
    const {
      id,
      webname,
      timezone,
      pstore,
      onesignal_keyId,
      onesignal_apikey,
      onesignal_appId,
      scredit,
      rcredit,
      delivery_charges,
      store_charges,
      tax,
      admin_tax,
      sms_type,
      one_key,
      terms_conditions,
      privacy_policy,
      cancellation_policy,
      refferal_amount,
      minimum_subscription_days,
      wallet_amt_suggestions,
      delivery_boy_tip_suggestions,
    } = req.body;

    console.log(
      terms_conditions,
      privacy_policy,
      cancellation_policy,
      refferal_amount,
      minimum_subscription_days,
      wallet_amt_suggestions,
      delivery_boy_tip_suggestions,
      "Request Body"
    );

    let imageUrl = null;
    console.log(req.file, "Uploaded File");

    if (req.file) {
      try {
        imageUrl = await uploadToS3(req.file, "weblogo");
        console.log("Uploaded image URL:", imageUrl);
      } catch (uploadError) {
        console.error("Error uploading to S3:", uploadError);
        return res.status(500).json({
          message: "Failed to upload weblogo to S3",
          error: uploadError.message,
        });
      }
    }

    let settings;

    if (id) {
      settings = await Settings.findByPk(id);
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }

      await settings.update({
        webname,
        weblogo: imageUrl || settings.weblogo,
        timezone,
        pstore,
        onesignal_keyId,
        onesignal_apikey,
        onesignal_appId,
        scredit,
        rcredit,
        delivery_charges,
        store_charges,
        tax,
        admin_tax,
        sms_type,
        one_key,
        terms_conditions,
        privacy_policy,
        cancellation_policy,
        refferal_amount: refferal_amount !== undefined && refferal_amount !== "" ? refferal_amount : settings.refferal_amount,
        minimum_subscription_days: minimum_subscription_days !== undefined && minimum_subscription_days !== "" ? minimum_subscription_days : settings.minimum_subscription_days,
        wallet_amt_suggestions: wallet_amt_suggestions ? JSON.stringify(wallet_amt_suggestions) : settings.wallet_amt_suggestions,
        delivery_boy_tip_suggestions: delivery_boy_tip_suggestions ? JSON.stringify(delivery_boy_tip_suggestions) : settings.delivery_boy_tip_suggestions,
      });

      return res.status(200).json({ message: "Settings updated successfully", settings });
    } else {
      settings = await Settings.create({
        webname,
        weblogo: imageUrl,
        timezone,
        pstore,
        onesignal_keyId,
        onesignal_apikey,
        onesignal_appId,
        scredit,
        rcredit,
        delivery_charges,
        store_charges,
        tax,
        admin_tax,
        sms_type,
        one_key,
        terms_conditions,
        privacy_policy,
        cancellation_policy,
        refferal_amount: refferal_amount !== undefined && refferal_amount !== "" ? refferal_amount : null,
        minimum_subscription_days,
        wallet_amt_suggestions: wallet_amt_suggestions ? JSON.stringify(wallet_amt_suggestions) : null,
        delivery_boy_tip_suggestions: delivery_boy_tip_suggestions ? JSON.stringify(delivery_boy_tip_suggestions) : null,
      });

      return res.status(201).json({ message: "Settings created successfully", settings });
    }
  } catch (error) {
    console.error("Error in UpsertSettings:", error);
    res.status(500).json({
      message: "Server error while creating/updating settings",
      error: error.message,
    });
  }
};

const getSettingsAll = async (req, res) => {
  try {
    let settings = await Settings.findAll();

    if (!settings || settings.length === 0) {
      return res.status(404).json({ response: "Settings not found", settings });
    }

    // Parse wallet_amt_suggestions and delivery_boy_tip_suggestions from JSON string to array for the frontend
    settings = settings.map(setting => {
      let parsedWalletSuggestions = null;
      let parsedTipSuggestions = null;

      try {
        parsedWalletSuggestions = setting.wallet_amt_suggestions
          ? JSON.parse(setting.wallet_amt_suggestions)
          : null;
      } catch (parseError) {
        console.error("Error parsing wallet_amt_suggestions:", parseError);
        parsedWalletSuggestions = null;
      }

      try {
        parsedTipSuggestions = setting.delivery_boy_tip_suggestions
          ? JSON.parse(setting.delivery_boy_tip_suggestions)
          : null;
      } catch (parseError) {
        console.error("Error parsing delivery_boy_tip_suggestions:", parseError);
        parsedTipSuggestions = null;
      }

      return {
        ...setting.dataValues,
        wallet_amt_suggestions: parsedWalletSuggestions,
        delivery_boy_tip_suggestions: parsedTipSuggestions,
      };
    });

    return res.status(200).json({ response: "Settings fetched successfully", settings });
  } catch (error) {
    console.error("Error in getSettingsAll:", error);
    return res.status(500).json({ response: "Server error" });
  }
};

module.exports = { UpsertSettings, getSettingsAll };