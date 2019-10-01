const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

//Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

//Mongo URI
const mongoURI =
	'Your Mongo DB connection string';

//Creat mongo connection
const conn = mongoose.createConnection(mongoURI);

//Init gfs
let gfs;

conn.once('open', () => {
	gfs = Grid(conn.db, mongoose.mongo);
	gfs.collection('uploads');
});

//Create storage engine
const storage = new GridFsStorage({
	url: mongoURI,
	file: (req, file) => {
		return new Promise((resolve, reject) => {
			crypto.randomBytes(16, (err, buf) => {
				if (err) {
					return reject(err);
				}
				const filename =
					file.originalname +
					' - ' +
					buf.toString('hex') +
					path.extname(file.originalname);
				const fileInfo = {
					filename: filename,
					bucketName: 'uploads'
				};
				resolve(fileInfo);
			});
		});
	}
});
const upload = multer({ storage });

//@route GET /
//@desc Loads form
app.get('/', (req, res) => {
	res.render('index');
});

//@route POST /upload
//@desc Uploads file to db
app.post('/upload', upload.single('file'), (req, res) => {
	// res.json({ file: req.file });
	res.redirect('/documents');
});

//@route GET /download/:filename
//@desc Download single file object
app.get('/download/:filename', (req, res) => {
	gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
		//Check if file exists
		if (!file || file.length === 0) {
			return (
				res,
				status(404).json({
					err: 'No file exists.'
				})
			);
		}
		//If the file exists
		res.set('Content-Type', file.contentType);
		res.set(
			'Content-Dispostion',
			'attachment; filename =" + file.filename + "'
		);

		//Stream from Gridfs
		const readstream = gfs.createReadStream({
			filename: req.params.filename
		});

		//error handling
		readstream.on('error', function(err) {
			console.log('An error ocurred!', err);
			throw err;
		});
		readstream.pipe(res);
	});
});

//@route GET /files/:filename
//@desc Display all files in JSON
app.get('/files/:filename', (req, res) => {
	gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
		if (!file || file.length === 0) {
			return res.status(404).json({
				err: 'No file exist'
			});
		}
		//File exists
		console.log(file);
		return res.json(file);
	});
});

//@route GET /files/
//@desc Display all files in JSON
app.get('/files/', (req, res) => {
	gfs.files.find().toArray((err, files) => {
		//Check if files exist
		if (!files || files.length === 0) {
			return res.status(404).json({
				err: 'No files exist'
			});
		}

		//Files exist
		return res.json(files);
	});
});

const port = 5001;

app.listen(port, () => console.log(`Server started on port ${port}`));
