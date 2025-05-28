const axios=require("axios")

const sendPushNotification = async ({ appId,apiKey,playerIds, data,headings,contents,}) => {
    console.log(appId,"11111111111")
    console.log(apiKey,"2222222222222222222222222")
    console.log(playerIds, "3333333333333333")
    console.log(data,"4444444444444444444")
    console.log(headings,"5555555555555555555555555",)
    console.log(contents,"666666666666666666666")
    try {
      const response = await axios.post(
        "https://onesignal.com/api/v1/notifications",
        {
          app_id: appId,
          include_player_ids: playerIds,
          data,
          contents,
          headings,
        },
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            Authorization: `Basic ${apiKey}`,
          },
        }
      );
      console.log("order instant")
      return response.data;
    } catch (error) {
      console.error("Push notification error:", error.message);
      return null;
    }
  };

  module.exports={sendPushNotification}




//   try {
//         const notificationContent = {
//           app_id: process.env.ONESIGNAL_CUSTOMER_APP_ID,
//           include_player_ids: [user.one_subscription],
//           data: { user_id: user.id, type: "instant order placed" },
//           contents: {
//             en: `${user.name}, Your order  has been confirmed!`,
//           },
//           headings: { en: "Order Confirmed!" },
//         };
  
//         const response = await axios.post(
//           "https://onesignal.com/api/v1/notifications",
//           notificationContent,
//           {
//             headers: {
//               "Content-Type": "application/json; charset=utf-8",
//               Authorization: `Basic ${process.env.ONESIGNAL_CUSTOMER_API_KEY}`,
//             },
//           }
//         );
  
//         // console.log(response, "notification sent");
//         console.log("User notification sent:", response.data);
//       } catch (error) {
//         console.log(error);
//       }