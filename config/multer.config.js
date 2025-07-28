const multer = require("multer");
const path = require("path");
const fs=require("fs");

const uploadDir=path.join(__dirname,"..","uploads")
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => {
        const uniqueSuffix = Date.now() + path.extname(file.originalname);
        cb(null, file.fieldname + "-" + uniqueSuffix);
    },
});

const upload = multer({ storage });
module.exports = upload;
