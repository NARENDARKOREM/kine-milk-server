Narender Korem
narendarkorem_33073
Online

Akhil_Diddi — 20-11-2024 15:38
hello
Narender Korem — 20-11-2024 15:39
Akhil_Diddi — 20-11-2024 15:39
Akhil_Diddi — 20-11-2024 15:40
lets go to tea
Akhil_Diddi — 20-11-2024 18:37
rey padandra babu
Akhil_Diddi — 21-11-2024 15:33
rey
insta lo okati pampina chudu ra
Akhil_Diddi — 21-11-2024 16:04
rey tea ki podam padara
Narender Korem — 20-12-2024 12:13
Forwarded
https://servostay-flame.vercel.app/
RentaL-Prop
Web site created using create-react-app
Narender Korem — 09-01-2025 18:13
sequelize
  .sync()
  .then(() => {
    console.log("Database & tables created!");
  })
  .catch((err) => {
    console.error("Unable to create the database:", err);
  });
Narender Korem — 03-02-2025 11:36
const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const e = require("express");

const Admin = sequelize.define(
  "Admin",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pro_pic: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dob: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  { tableName: "admins", timestamps: true, paranoid: true }
);

module.exports = Admin;
Narender Korem — 06-02-2025 19:59
platix-db.cf6kk2eaeait.ap-south-1.rds.amazonaws.com
platix123
platix_db
Narender Korem — 10-02-2025 11:19
let extraImageUrls = [];

    if (req.files["img"]) {
      imageUrl = await uploadToS3(req.files["img"][0], "images");
    }
Narender Korem — 05-03-2025 14:31
https://app.getpostman.com/join-team?invite_code=802229589ca0eb869b44be124a6afadb64f15fa8ffc6118ef6262ba5ea15a0d8&target_code=0d6adc0b04e9845bccedc904fe8d8991
A teammate invited you to join their workspace
Join this workspace to start viewing and collaborating on API requests, collections, designs and more.
A teammate invited you to join their workspace
https://app.getpostman.com/join-team?invite_code=802229589ca0eb869b44be124a6afadb64f15fa8ffc6118ef6262ba5ea15a0d8&target_code=ca6e20307370b87f68797b78e9f65837
A teammate invited you to join their workspace
Join this workspace to start viewing and collaborating on API requests, collections, designs and more.
A teammate invited you to join their workspace
Narender Korem — 06-03-2025 13:05
<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="30" height="30" rx="15" fill="#F8E4D3"/>
<g clip-path="url(#clip0_1248_30271)">
<path d="M21.63 12.2021L20.3327 10.5341V9.33407C20.3327 8.0474 19.286 7.00073 17.9993 7.00073H11.9993C10.7127 7.00073 9.66602 8.0474 9.66602 9.33407V10.5341L8.36868 12.2021C7.91535 12.7847 7.66602 13.5114 7.66602 14.2487V19.6667C7.66602 21.5047 9.16135 23.0001 10.9993 23.0001H18.9993C20.8373 23.0001 22.3327 21.5047 22.3327 19.6667V14.2487C22.3327 13.5114 22.0833 12.7847 21.63 12.2021ZM16.508 12.1327C16.2767 12.3921 16.1007 12.6881 15.962 13.0001H9.43602L10.992 11.0001H17.5147L16.508 12.1327ZM11.9993 8.3334H17.9993C18.5507 8.3334 18.9993 8.78207 18.9993 9.3334V9.66673H10.9993V9.3334C10.9993 8.78207 11.448 8.3334 11.9993 8.3334ZM8.99935 19.6667V14.3334H15.6673C15.6673 14.3381 15.666 14.3427 15.666 14.3474V19.6667C15.666 20.4201 15.9267 21.1081 16.35 21.6667H10.9993C9.89668 21.6667 8.99935 20.7694 8.99935 19.6667ZM20.9993 19.6667C20.9993 20.7694 20.102 21.6667 18.9993 21.6667C17.8967 21.6667 16.9993 20.7694 16.9993 19.6667V14.3474C16.9993 13.8567 17.1793 13.3854 17.5047 13.0187L19.1427 11.1754L20.578 13.0201C20.8493 13.3694 20.9993 13.8061 20.9993 14.2481V19.6667Z" fill="#DF934B"/>
</g>
<defs>
<clipPath id="clip0_1248_30271">
<rect width="16" height="16" fill="white" transform="translate(7 7)"/>
</clipPath>
</defs>
</svg>
<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="30" height="30" rx="15" fill="#D0F7F7"/>
<g clip-path="url(#clip0_1248_30276)">
<path d="M13.0049 11.3379C13.0049 10.7859 13.4529 10.3379 14.0049 10.3379C14.5569 10.3379 15.0049 10.7859 15.0049 11.3379C15.0049 11.8899 14.5569 12.3379 14.0049 12.3379C13.4529 12.3379 13.0049 11.8899 13.0049 11.3379ZM22.9776 15.9959C22.4596 19.0632 20.4009 21.7879 17.8229 23.0059H12.1883C9.61094 21.7879 7.55294 19.0626 7.03361 15.9952C6.93628 15.4206 7.09761 14.8339 7.47628 14.3859C7.71094 14.1072 8.01294 13.9026 8.34828 13.7852C8.34361 13.7179 8.33894 13.6506 8.33894 13.5826C8.33894 12.5819 8.85028 11.6806 9.67761 11.1632C9.67361 11.1092 9.67161 11.0566 9.67161 11.0046C9.67161 9.43724 11.0403 8.16057 12.6296 8.35524C13.1243 7.52857 14.0176 7.00391 15.0056 7.00391C15.9936 7.00391 16.8869 7.52791 17.3816 8.35524C18.9249 8.17124 20.2783 9.38257 20.3369 10.9012C21.1609 11.4219 21.6723 12.3259 21.6723 13.3172C21.6723 13.4706 21.6556 13.6232 21.6309 13.7739C21.9789 13.8892 22.2923 14.0979 22.5356 14.3852C22.9136 14.8339 23.0749 15.4206 22.9776 15.9952V15.9959ZM9.67228 13.5832C9.67228 13.6132 9.67894 13.6426 9.68028 13.6726H15.7296C15.6909 13.5666 15.6669 13.4532 15.6669 13.3339C15.6669 12.7819 16.1149 12.3339 16.6669 12.3339C17.2189 12.3339 17.6669 12.7819 17.6669 13.3339C17.6669 13.4532 17.6423 13.5666 17.6043 13.6726H20.2969C20.3243 13.5579 20.3389 13.4399 20.3389 13.3186C20.3389 12.7019 19.9649 12.1472 19.3863 11.9059L18.9089 11.7066C18.9089 11.7066 19.0056 11.0626 19.0056 11.0052C19.0056 10.2699 18.4076 9.67191 17.6723 9.67191C17.3749 9.67191 16.5869 9.98524 16.5869 9.98524L16.3729 9.33657C16.1749 8.73924 15.6263 8.33791 15.0056 8.33791C14.3849 8.33791 13.8356 8.73991 13.6376 9.33724L13.4236 9.98524C13.4236 9.98524 12.7396 9.67191 12.3383 9.67191C11.6029 9.67191 11.0049 10.2699 11.0049 11.0052C11.0049 11.1072 11.2209 11.9392 11.2209 11.9392L10.6589 12.1566C10.0596 12.3886 9.67228 12.9486 9.67228 13.5832ZM21.5169 15.2466C21.3876 15.0939 21.1989 15.0059 20.9996 15.0059H9.01228C8.81294 15.0059 8.62428 15.0939 8.49494 15.2466C8.42228 15.3332 8.30561 15.5172 8.34894 15.7732C8.78028 18.3239 10.3996 20.6219 12.4923 21.6726H17.5196C19.6129 20.6226 21.2316 18.3246 21.6629 15.7732C21.7063 15.5166 21.5903 15.3332 21.5169 15.2466Z" fill="#38A0A2"/>
</g>
<defs>
Expand
message.txt
3 KB
<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="30" height="30" rx="15" fill="#FFF5C4"/>
<g clip-path="url(#clip0_1248_30281)">
<path d="M13.9397 9C13.6244 7.85067 12.5137 7 11.1957 7C9.75502 7 7.00035 8.03867 7.00035 9.66667C7.00035 11.2947 9.75502 12.3333 11.1957 12.3333C12.5137 12.3333 13.6244 11.4827 13.9397 10.3333H23.029V9H13.9397ZM11.1957 11C10.0444 11 8.33369 10.1253 8.33369 9.66667C8.33369 9.208 10.0444 8.33333 11.1957 8.33333C12.023 8.33333 12.6957 8.93133 12.6957 9.66667C12.6957 10.402 12.023 11 11.1957 11ZM20.9937 14.3487H9.00635C8.42835 14.3487 7.87835 14.606 7.49635 15.054C7.10035 15.5193 6.92902 16.134 7.02702 16.7413C7.56569 20.0773 10.189 22.0173 12.1777 23H17.823C19.811 22.0173 22.4344 20.0773 22.973 16.7413C23.071 16.1347 22.9004 15.5193 22.5037 15.0547C22.1217 14.606 21.5717 14.3487 20.9937 14.3487ZM21.6564 16.5293C21.2204 19.2307 19.191 20.8067 17.509 21.6667H12.491C10.8084 20.8067 8.77969 19.2307 8.34302 16.5293C8.30769 16.3087 8.36902 16.086 8.51102 15.9187C8.58635 15.8307 8.75102 15.6827 9.00635 15.6827H20.9937C21.249 15.6827 21.413 15.8313 21.4884 15.9193C21.631 16.086 21.6924 16.3087 21.6564 16.5293Z" fill="#D1B226"/>
</g>
<defs>
<clipPath id="clip0_1248_30281">
<rect width="16" height="16" fill="white" transform="translate(7 7)"/>
</clipPath>
</defs>
</svg>
<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="30" height="30" rx="15" fill="#E1E8F8"/>
<g clip-path="url(#clip0_1248_30286)">
<path d="M21.666 10.3333H16.67L16.8473 8.91733C16.8887 8.584 17.1733 8.33333 17.5093 8.33333H19.666C20.034 8.33333 20.3327 8.03467 20.3327 7.66667C20.3327 7.29867 20.034 7 19.666 7H17.5093C16.5033 7 15.6493 7.75267 15.5247 8.75133L15.3267 10.3333H8.33268C7.96468 10.3333 7.66602 10.632 7.66602 11C7.66602 11.368 7.96468 11.6667 8.33268 11.6667H8.74002L9.73068 20.0573C9.92868 21.7353 11.352 23 13.0413 23H16.958C18.6473 23 20.0707 21.7347 20.268 20.0573L21.2587 11.6667H21.666C22.034 11.6667 22.3327 11.368 22.3327 11C22.3327 10.632 22.034 10.3333 21.666 10.3333ZM16.958 21.6667H13.0413C12.0273 21.6667 11.174 20.9073 11.0553 19.9013L10.746 17.28C11.3047 16.8973 12.2813 16.334 13 16.334C13.5093 16.334 14.0887 16.624 14.702 16.9307C15.4267 17.2927 16.176 17.6673 17 17.6673C17.796 17.6673 18.6413 17.3047 19.2947 16.9367L18.9447 19.902C18.826 20.9087 17.9727 21.6673 16.9587 21.6673L16.958 21.6667ZM19.4973 15.2127C19.0313 15.564 17.8387 16.3333 16.9993 16.3333C16.49 16.3333 15.9107 16.0433 15.2973 15.7367C14.5727 15.3747 13.8233 15 12.9993 15C12.148 15 11.24 15.4153 10.5713 15.8073L10.0827 11.6667H19.916L19.4973 15.2127Z" fill="#63759F"/>
</g>
<defs>
<clipPath id="clip0_1248_30286">
<rect width="16" height="16" fill="white" transform="translate(7 7)"/>
</clipPath>
</defs>
</svg>
Narender Korem — 06-03-2025 14:35
<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="30" height="30" rx="15" fill="#E1E8F8"/>
<g clip-path="url(#clip0_1248_30286)">
<path d="M21.666 10.3333H16.67L16.8473 8.91733C16.8887 8.584 17.1733 8.33333 17.5093 8.33333H19.666C20.034 8.33333 20.3327 8.03467 20.3327 7.66667C20.3327 7.29867 20.034 7 19.666 7H17.5093C16.5033 7 15.6493 7.75267 15.5247 8.75133L15.3267 10.3333H8.33268C7.96468 10.3333 7.66602 10.632 7.66602 11C7.66602 11.368 7.96468 11.6667 8.33268 11.6667H8.74002L9.73068 20.0573C9.92868 21.7353 11.352 23 13.0413 23H16.958C18.6473 23 20.0707 21.7347 20.268 20.0573L21.2587 11.6667H21.666C22.034 11.6667 22.3327 11.368 22.3327 11C22.3327 10.632 22.034 10.3333 21.666 10.3333ZM16.958 21.6667H13.0413C12.0273 21.6667 11.174 20.9073 11.0553 19.9013L10.746 17.28C11.3047 16.8973 12.2813 16.334 13 16.334C13.5093 16.334 14.0887 16.624 14.702 16.9307C15.4267 17.2927 16.176 17.6673 17 17.6673C17.796 17.6673 18.6413 17.3047 19.2947 16.9367L18.9447 19.902C18.826 20.9087 17.9727 21.6673 16.9587 21.6673L16.958 21.6667ZM19.4973 15.2127C19.0313 15.564 17.8387 16.3333 16.9993 16.3333C16.49 16.3333 15.9107 16.0433 15.2973 15.7367C14.5727 15.3747 13.8233 15 12.9993 15C12.148 15 11.24 15.4153 10.5713 15.8073L10.0827 11.6667H19.916L19.4973 15.2127Z" fill="#63759F"/>
</g>
<defs>
Expand
icon4.svg
2 KB
<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="30" height="30" rx="15" fill="#F8E4D3"/>
<g clip-path="url(#clip0_1248_30271)">
<path d="M21.63 12.2021L20.3327 10.5341V9.33407C20.3327 8.0474 19.286 7.00073 17.9993 7.00073H11.9993C10.7127 7.00073 9.66602 8.0474 9.66602 9.33407V10.5341L8.36868 12.2021C7.91535 12.7847 7.66602 13.5114 7.66602 14.2487V19.6667C7.66602 21.5047 9.16135 23.0001 10.9993 23.0001H18.9993C20.8373 23.0001 22.3327 21.5047 22.3327 19.6667V14.2487C22.3327 13.5114 22.0833 12.7847 21.63 12.2021ZM16.508 12.1327C16.2767 12.3921 16.1007 12.6881 15.962 13.0001H9.43602L10.992 11.0001H17.5147L16.508 12.1327ZM11.9993 8.3334H17.9993C18.5507 8.3334 18.9993 8.78207 18.9993 9.3334V9.66673H10.9993V9.3334C10.9993 8.78207 11.448 8.3334 11.9993 8.3334ZM8.99935 19.6667V14.3334H15.6673C15.6673 14.3381 15.666 14.3427 15.666 14.3474V19.6667C15.666 20.4201 15.9267 21.1081 16.35 21.6667H10.9993C9.89668 21.6667 8.99935 20.7694 8.99935 19.6667ZM20.9993 19.6667C20.9993 20.7694 20.102 21.6667 18.9993 21.6667C17.8967 21.6667 16.9993 20.7694 16.9993 19.6667V14.3474C16.9993 13.8567 17.1793 13.3854 17.5047 13.0187L19.1427 11.1754L20.578 13.0201C20.8493 13.3694 20.9993 13.8061 20.9993 14.2481V19.6667Z" fill="#DF934B"/>
</g>
<defs>
Expand
icon1.svg
2 KB
<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="30" height="30" rx="15" fill="#D0F7F7"/>
<g clip-path="url(#clip0_1248_30276)">
<path d="M13.0049 11.3379C13.0049 10.7859 13.4529 10.3379 14.0049 10.3379C14.5569 10.3379 15.0049 10.7859 15.0049 11.3379C15.0049 11.8899 14.5569 12.3379 14.0049 12.3379C13.4529 12.3379 13.0049 11.8899 13.0049 11.3379ZM22.9776 15.9959C22.4596 19.0632 20.4009 21.7879 17.8229 23.0059H12.1883C9.61094 21.7879 7.55294 19.0626 7.03361 15.9952C6.93628 15.4206 7.09761 14.8339 7.47628 14.3859C7.71094 14.1072 8.01294 13.9026 8.34828 13.7852C8.34361 13.7179 8.33894 13.6506 8.33894 13.5826C8.33894 12.5819 8.85028 11.6806 9.67761 11.1632C9.67361 11.1092 9.67161 11.0566 9.67161 11.0046C9.67161 9.43724 11.0403 8.16057 12.6296 8.35524C13.1243 7.52857 14.0176 7.00391 15.0056 7.00391C15.9936 7.00391 16.8869 7.52791 17.3816 8.35524C18.9249 8.17124 20.2783 9.38257 20.3369 10.9012C21.1609 11.4219 21.6723 12.3259 21.6723 13.3172C21.6723 13.4706 21.6556 13.6232 21.6309 13.7739C21.9789 13.8892 22.2923 14.0979 22.5356 14.3852C22.9136 14.8339 23.0749 15.4206 22.9776 15.9952V15.9959ZM9.67228 13.5832C9.67228 13.6132 9.67894 13.6426 9.68028 13.6726H15.7296C15.6909 13.5666 15.6669 13.4532 15.6669 13.3339C15.6669 12.7819 16.1149 12.3339 16.6669 12.3339C17.2189 12.3339 17.6669 12.7819 17.6669 13.3339C17.6669 13.4532 17.6423 13.5666 17.6043 13.6726H20.2969C20.3243 13.5579 20.3389 13.4399 20.3389 13.3186C20.3389 12.7019 19.9649 12.1472 19.3863 11.9059L18.9089 11.7066C18.9089 11.7066 19.0056 11.0626 19.0056 11.0052C19.0056 10.2699 18.4076 9.67191 17.6723 9.67191C17.3749 9.67191 16.5869 9.98524 16.5869 9.98524L16.3729 9.33657C16.1749 8.73924 15.6263 8.33791 15.0056 8.33791C14.3849 8.33791 13.8356 8.73991 13.6376 9.33724L13.4236 9.98524C13.4236 9.98524 12.7396 9.67191 12.3383 9.67191C11.6029 9.67191 11.0049 10.2699 11.0049 11.0052C11.0049 11.1072 11.2209 11.9392 11.2209 11.9392L10.6589 12.1566C10.0596 12.3886 9.67228 12.9486 9.67228 13.5832ZM21.5169 15.2466C21.3876 15.0939 21.1989 15.0059 20.9996 15.0059H9.01228C8.81294 15.0059 8.62428 15.0939 8.49494 15.2466C8.42228 15.3332 8.30561 15.5172 8.34894 15.7732C8.78028 18.3239 10.3996 20.6219 12.4923 21.6726H17.5196C19.6129 20.6226 21.2316 18.3246 21.6629 15.7732C21.7063 15.5166 21.5903 15.3332 21.5169 15.2466Z" fill="#38A0A2"/>
</g>
<defs>
Expand
icon2.svg
3 KB
<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="30" height="30" rx="15" fill="#FFF5C4"/>
<g clip-path="url(#clip0_1248_30281)">
<path d="M13.9397 9C13.6244 7.85067 12.5137 7 11.1957 7C9.75502 7 7.00035 8.03867 7.00035 9.66667C7.00035 11.2947 9.75502 12.3333 11.1957 12.3333C12.5137 12.3333 13.6244 11.4827 13.9397 10.3333H23.029V9H13.9397ZM11.1957 11C10.0444 11 8.33369 10.1253 8.33369 9.66667C8.33369 9.208 10.0444 8.33333 11.1957 8.33333C12.023 8.33333 12.6957 8.93133 12.6957 9.66667C12.6957 10.402 12.023 11 11.1957 11ZM20.9937 14.3487H9.00635C8.42835 14.3487 7.87835 14.606 7.49635 15.054C7.10035 15.5193 6.92902 16.134 7.02702 16.7413C7.56569 20.0773 10.189 22.0173 12.1777 23H17.823C19.811 22.0173 22.4344 20.0773 22.973 16.7413C23.071 16.1347 22.9004 15.5193 22.5037 15.0547C22.1217 14.606 21.5717 14.3487 20.9937 14.3487ZM21.6564 16.5293C21.2204 19.2307 19.191 20.8067 17.509 21.6667H12.491C10.8084 20.8067 8.77969 19.2307 8.34302 16.5293C8.30769 16.3087 8.36902 16.086 8.51102 15.9187C8.58635 15.8307 8.75102 15.6827 9.00635 15.6827H20.9937C21.249 15.6827 21.413 15.8313 21.4884 15.9193C21.631 16.086 21.6924 16.3087 21.6564 16.5293Z" fill="#D1B226"/>
</g>
<defs>
Expand
icon3.svg
2 KB
Narender Korem — 11-03-2025 12:00
ALTER TABLE tbl_normal_order
DROP FOREIGN KEY tbl_normal_order_ibfk_1553;
Akhil_Diddi — 18-03-2025 10:14
Hello
Narender Korem — 03-04-2025 15:17
https://github.com/NARENDARKOREM/Property-Rental-backend.git
GitHub
GitHub - NARENDARKOREM/Property-Rental-backend
Contribute to NARENDARKOREM/Property-Rental-backend development by creating an account on GitHub.
Narender Korem — 18-04-2025 13:59
Forwarded
DB_PORT=3306
DB_USER=KinemilkAdmin
DB_NAME=kinemilk_db
DB_PASSWORD=kinemilk123
DB_DIALECT=mysql
JWT_SECRET=jwt-secure-secret-key
Expand
message.txt
9 KB
require("dotenv").config();
const admin = require("firebase-admin");

const storeServiceAccount = {
  type: process.env.STORE_TYPE,
  project_id: process.env.STORE_PROJECT_ID,
Expand
message.txt
3 KB
Narender Korem — 18-04-2025 15:55
---------------------------------
Fetch Dentist Organizations

End-Point: /dentist/get-dentist-organization
Method: GET
Token: Required
Body: None
Response:
{
    "success": true,
    "message": "Dentist organizations fetched successfully",
    "data": [
        {
            "id": "02ce99ba-4fe0-4ec3-8927-b6bd1a1b1b58",
Expand
message.txt
7 KB
Narender Korem — 30-04-2025 14:53
#### STORE APP CONFIGURATION ####

# Store Service Account
STORE_TYPE=service_account
STORE_PROJECT_ID=kinemilk-storeapp
STORE_PRIVATE_KEY_ID=c41d5de9c785c27cd7e99671b197bb822ab0f461
Expand
message.txt
9 KB
Akhil_Diddi — 30-04-2025 15:05
https://kine-client-dev.vercel.app/
Kine Milk
Web site created using create-react-app
Narender Korem — 30-04-2025 17:48
kinemilk-db-test.cf6kk2eaeait.ap-south-1.rds.amazonaws.com
Akhil_Diddi — 06-05-2025 18:35
327cd809-06d1-4a72-881e-56158b455b5a
Narender Korem — 26-05-2025 12:04
const index = require("./Models/index");
Narender Korem — 09-06-2025 10:57
const upsertProductImages = async (req, res) => {
    const { id, product_id, status, existing_images } = req.body;

    try {
        if (!product_id) {
            return res.status(400).json({ error: "Product ID is required." });
Expand
message.txt
4 KB
Akhil_Diddi — 15:49
const asyncHandler = require("../middlewares/errorHandler");
const s3 = require("../config/awss3Config");
const uploadToS3 = require("../config/fileUpload.aws");
const logger = require("../utils/logger");
const Illustration = require("../Models/Illustration");
const { Sequelize } = require("sequelize");
Expand
message.txt
17 KB
﻿
Akhil_Diddi
akhil_diddi_70565
const asyncHandler = require("../middlewares/errorHandler");
const s3 = require("../config/awss3Config");
const uploadToS3 = require("../config/fileUpload.aws");
const logger = require("../utils/logger");
const Illustration = require("../Models/Illustration");
const { Sequelize } = require("sequelize");

// Verify Illustration model is defined
if (!Illustration || typeof Illustration.create !== "function") {
  logger.error("Illustration model is not properly defined or exported");
  throw new Error("Illustration model is not properly defined or exported");
}

// Log server timezone for debugging
logger.info(`Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

// Helper function to convert UTC to IST
const convertUTCToIST = (date) => {
  if (!date) return null;
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  return new Date(new Date(date).getTime() + istOffset);
};

// Schedule illustration activation and status update
const cron = require("node-cron");
cron.schedule("* * * * *", async () => {
  try {
    const nowInIST = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowInUTC = new Date(nowInIST.getTime() - istOffset);

    // Activate illustrations with startTime
    const illustrationsToActivate = await Illustration.findAll({
      where: {
        status: 0,
        startTime: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: nowInUTC },
          ],
        },
      },
    });

    for (const illustration of illustrationsToActivate) {
      await illustration.update({
        status: 1,
        // Explicitly do not clear startTime to preserve it
      });
      logger.info(
        `Illustration ID ${illustration.id} published at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. ` +
        `startTime preserved: ${illustration.startTime ? convertUTCToIST(illustration.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
    }

    // Unpublish illustrations that have reached endTime
    const illustrationsToUnpublish = await Illustration.findAll({
      where: {
        status: 1,
        endTime: {
          [Sequelize.Op.and]: [
            { [Sequelize.Op.ne]: null },
            { [Sequelize.Op.lte]: nowInUTC },
          ],
        },
      },
    });

    for (const illustration of illustrationsToUnpublish) {
      await illustration.update({
        status: 0,
        // Explicitly do not clear endTime to preserve it
      });
      logger.info(
        `Illustration ID ${illustration.id} unpublished at ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}. ` +
        `endTime preserved: ${illustration.endTime ? convertUTCToIST(illustration.endTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
    }
  } catch (error) {
    logger.error(`Error in illustration scheduling job: ${error.message}`);
  }
});

const upsertIllustration = asyncHandler(async (req, res, next) => {
  try {
    const { id, screenName, status, startTime, endTime } = req.body;
    let imageUrl;

    // Check if file is provided
    if (req.file) {
      imageUrl = await uploadToS3(req.file, "image");
    } else if (!id) {
      logger.error("Image is required for a new illustration");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Image is required for a new illustration.",
      });
    }

    const statusValue = parseInt(status, 10);
    const validStatuses = [0, 1];
    if (!validStatuses.includes(statusValue)) {
      logger.error("Invalid status value");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Status must be 0 (Unpublished) or 1 (Published).",
      });
    }

    const parseISTDate = (dateString, fieldName) => {
      if (dateString === "" || dateString === null) {
        logger.info(`Clearing ${fieldName} for ${id ? `illustration ${id}` : "new illustration"}`);
        return null; // Explicitly clear the date
      }
      if (dateString) {
        const istDate = new Date(dateString);
        if (isNaN(istDate.getTime())) {
          throw new Error(`Invalid ${fieldName} format`);
        }
        return istDate;
      }
      return undefined; // Preserve existing value if no date provided
    };

    const convertISTToUTC = (date) => {
      if (!date) return null;
      const istOffset = 5.5 * 60 * 60 * 1000;
      return new Date(date.getTime() - istOffset);
    };

    const startDate = parseISTDate(startTime, "startTime");
    const endDate = parseISTDate(endTime, "endTime");

    const nowInIST = new Date();

    logger.info(`Current time in IST: ${nowInIST.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    if (startDate) {
      logger.info(`Parsed startTime (IST): ${startDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }
    if (endDate) {
      logger.info(`Parsed endTime (IST): ${endDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    }

    if (endDate && endDate <= nowInIST) {
      logger.error("End time must be in the future");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "End time must be in the future.",
      });
    }
    if (startDate && endDate && startDate >= endDate) {
      logger.error("End time must be greater than start time");
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "End time must be greater than start time.",
      });
    }

    const adjustedStartTime = startDate !== undefined ? convertISTToUTC(startDate) : null;
    const adjustedEndTime = endDate !== undefined ? convertISTToUTC(endDate) : null;

    let effectiveStatus = statusValue;
    if (startDate && startDate > nowInIST) {
      effectiveStatus = 0; // Force unpublished if start date is in the future
    } else if (startDate && startDate <= nowInIST) {
      effectiveStatus = 1; // Auto-publish if start date has passed
    }

    let illustration;
    if (id) {
      illustration = await Illustration.findByPk(id);
      if (!illustration) {
        logger.error(`Illustration with ID ${id} not found`);
        return res.status(404).json({
          ResponseCode: "404",
          Result: "false",
          ResponseMsg: "Illustration not found.",
        });
      }

      await illustration.update({
        screenName,
        img: imageUrl || illustration.img,
        status: effectiveStatus,
        startTime: startDate !== undefined ? adjustedStartTime : illustration.startTime,
        endTime: endDate !== undefined ? adjustedEndTime : illustration.endTime,
      });

      logger.info(
        `Illustration ${id} updated successfully. ` +
        `Status: ${effectiveStatus}, ` +
        `startTime: ${illustration.startTime ? convertUTCToIST(illustration.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
        `endTime: ${illustration.endTime ? convertUTCToIST(illustration.endTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Illustration updated successfully.",
        illustration: {
          ...illustration.toJSON(),
          startTime: convertUTCToIST(illustration.startTime),
          endTime: convertUTCToIST(illustration.endTime),
        },
      });
    } else {
      illustration = await Illustration.create({
        screenName,
        img: imageUrl,
        status: effectiveStatus,
        startTime: adjustedStartTime,
        endTime: adjustedEndTime,
      });

      logger.info(
        `New illustration created with ID ${illustration.id}. ` +
        `Status: ${effectiveStatus}, ` +
        `startTime: ${illustration.startTime ? convertUTCToIST(illustration.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
        `endTime: ${illustration.endTime ? convertUTCToIST(illustration.endTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
      );
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Illustration created successfully.",
        illustration: {
          ...illustration.toJSON(),
          startTime: convertUTCToIST(illustration.startTime),
          endTime: convertUTCToIST(illustration.endTime),
        },
      });
    }
  } catch (error) {
    logger.error(`Error processing illustration: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
});

const fetchIllustrationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const illustration = await Illustration.findByPk(id);
    if (!illustration) {
      logger.error(`Illustration with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Illustration not found",
      });
    }
    logger.info(`Illustration fetched by ID ${id}`);
    res.status(200).json({
      ...illustration.toJSON(),
      startTime: convertUTCToIST(illustration.startTime),
      endTime: convertUTCToIST(illustration.endTime),
    });
  } catch (error) {
    logger.error(`Error fetching illustration by ID ${id}: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Server error at fetch illustration",
    });
  }
});

const fetchIllustrations = asyncHandler(async (req, res) => {
  try {
    const illustrations = await Illustration.findAll();
    logger.info("Successfully fetched all illustrations");
    const illustrationsWithIST = illustrations.map(illustration => ({
      ...illustration.toJSON(),
      startTime: convertUTCToIST(illustration.startTime),
      endTime: convertUTCToIST(illustration.endTime),
    }));
    res.status(200).json(illustrationsWithIST);
  } catch (error) {
    logger.error(`Error fetching illustrations: ${error.message}`);
    res.status(400).json({
      ResponseCode: "400",
      Result: "false",
      ResponseMsg: "Failed to fetch illustrations",
    });
  }
});

const deleteIllustrationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { forceDelete } = req.body;

  try {
    const illustration = await Illustration.findOne({ where: { id }, paranoid: false });

    if (!illustration) {
      logger.error(`Illustration with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Illustration not found",
      });
    }

    if (illustration.deletedAt && forceDelete !== "true") {
      logger.error(`Illustration ID ${id} is already soft-deleted`);
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Illustration is already soft-deleted. Use forceDelete=true to permanently delete it.",
      });
    }

    if (forceDelete === "true") {
      await Illustration.destroy({ where: { id }, force: true });
      logger.info(`Illustration with ID ${id} permanently deleted`);
      return res.status(200).json({
        ResponseCode: "200",
        Result: "true",
        ResponseMsg: "Illustration permanently deleted successfully",
      });
    }

    await Illustration.destroy({ where: { id } });
    logger.info(`Illustration ID ${id} soft-deleted`);
    return res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Illustration soft deleted successfully",
    });
  } catch (error) {
    logger.error(`Error deleting illustration with ID ${id}: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal Server Error",
    });
  }
});

const toggleIllustrationStatus = asyncHandler(async (req, res) => {
  const { id, value, startTime, endTime } = req.body;
  try {
    const illustration = await Illustration.findByPk(id);
    if (!illustration) {
      logger.error(`Illustration with ID ${id} not found`);
      return res.status(404).json({
        ResponseCode: "404",
        Result: "false",
        ResponseMsg: "Illustration not found.",
      });
    }

    const nowInIST = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowInUTC = new Date(nowInIST.getTime() - istOffset);
    const startDate = illustration.startTime ? new Date(illustration.startTime) : null;
    const endDate = illustration.endTime ? new Date(illustration.endTime) : null;

    // Log if startTime or endTime were included in the request
    if (startTime !== undefined) {
      logger.warn(`startTime (${startTime}) included in toggleIllustrationStatus for illustration ${id}; ignoring to preserve existing value`);
    }
    if (endTime !== undefined) {
      logger.warn(`endTime (${endTime}) included in toggleIllustrationStatus for illustration ${id}; ignoring to preserve existing value`);
    }

    // Prevent toggling to Published if startTime is future or endTime has passed
    if (value === 1) {
      if (startDate && startDate > nowInUTC) {
        logger.error(`Cannot toggle status to Published for illustration ID ${id} with future startTime`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot toggle status to Published for an illustration with a future startTime. It will be published automatically when the startTime is reached.",
        });
      }
      if (endDate && endDate <= nowInUTC) {
        logger.error(`Cannot toggle status to Published for illustration ID ${id} with expired endTime`);
        return res.status(400).json({
          ResponseCode: "400",
          Result: "false",
          ResponseMsg: "Cannot toggle status to Published for an illustration with an expired endTime. Please edit the illustration to update the endTime.",
        });
      }
    }

    const statusValue = parseInt(value, 10);
    const validStatuses = [0, 1];
    if (!validStatuses.includes(statusValue)) {
      logger.error(`Invalid status value: ${value}`);
      return res.status(400).json({
        ResponseCode: "400",
        Result: "false",
        ResponseMsg: "Status must be 0 (Unpublished) or 1 (Published).",
      });
    }

    illustration.status = statusValue;
    // Explicitly do not clear or modify startTime or endTime
    await illustration.save();
    logger.info(
      `Illustration status updated for ID ${illustration.id} to ${statusValue}. ` +
      `startTime preserved: ${illustration.startTime ? convertUTCToIST(illustration.startTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}, ` +
      `endTime preserved: ${illustration.endTime ? convertUTCToIST(illustration.endTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "null"}`
    );
    res.status(200).json({
      ResponseCode: "200",
      Result: "true",
      ResponseMsg: "Illustration status updated successfully.",
      updatedStatus: illustration.status,
      startTime: convertUTCToIST(illustration.startTime),
      endTime: convertUTCToIST(illustration.endTime),
    });
  } catch (error) {
    logger.error(`Error updating illustration status for ID ${id}: ${error.message}`);
    res.status(500).json({
      ResponseCode: "500",
      Result: "false",
      ResponseMsg: "Internal server error.",
    });
  }
});

module.exports = {
  upsertIllustration,
  fetchIllustrationById,
  fetchIllustrations,
  deleteIllustrationById,
  toggleIllustrationStatus,
};
