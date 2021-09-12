//reset state on load/reload
function onLoad() {
	document.getElementById('convert').disabled = true;
	document.getElementById('save').disabled = true;
	document.getElementById('save-label').innerHTML = "";
	document.getElementById('upload').value = "";
	document.getElementById('settings-popup').style.visibility = 'hidden';
}

//open an image file and preview it on a canvas
function openFile(file) {
	let input = file.target;
	output = document.getElementById('output');
	let preview = document.getElementById('imagepreview');
	let canvas = document.getElementById('canvas');
	let context = canvas.getContext('2d');
	let ctx = preview.getContext('2d');
	context.clearRect(0, 0, canvas.width, canvas.height);
	ctx.clearRect(0, 0, preview.width, preview.height);
    let reader = new FileReader();
    reader.onload = function(){
		//reset state from previously loaded image
		let dataURL = reader.result;
		output.src = dataURL;
		objNormals = [];
		objVertices = [];
		objFaces = [];
		objMtl = [];
	};
	let nameArr = input.files[0].name.split(".");
	fileName = nameArr[0];
	reader.readAsDataURL(input.files[0]);
	output.onload = function(){
		canvasPosX = 0;
		canvasPosY = 0;
		canvasWidth = output.width;
		canvasHeight = output.height;
		preview.width = canvasWidth;
		preview.height = canvasHeight;
		ctx.drawImage(output, canvasPosX, canvasPosY);
		document.getElementById('convert').disabled = false;
		document.getElementById('save').disabled = true;
		document.getElementById('save-label').innerHTML = "Ready to convert";
	}
  }

//read data from loaded image, and create vert, normal, and face data to cache for each pixel
function convertToObj() {
	let canvas = document.getElementById('canvas');
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;
	let context = canvas.getContext('2d');
	context.transform(1, 0, 0, -1, 0, canvas.height)
	context.drawImage(output, canvasPosX, canvasPosY);
	document.getElementById('convert').disabled = true;
	document.getElementById('save').disabled = false;
	document.getElementById('save-label').innerHTML = "Conversion Successful";
	for (let x=0;x<output.width;x++)
	{
		for (let y=0;y<output.height;y++)
		{
			let data = context.getImageData(x, y, 1, 1).data;
			if (data[3] == 0)
			{
				continue;
			}
			createCubeAtPosition(x, y, data)
		}
	}
}


//when called from the save button, convert cached data into obj and mtl text files and save them in a zip
function saveModel() {
	let matBlob = saveMtl();
	let objBlob = saveObj();
	downloadObjZip(matBlob, objBlob);
}

//download zipped obj and mtl for new model
async function downloadObjZip(mtlContent, objContent) {
	// define what we want in the ZIP
	const obj = { name: fileName + '.obj', lastModified: new Date(), input: objContent };
	const mtl = { name: fileName + '.mtl', lastModified: new Date(), input: mtlContent };
  
	// get the ZIP stream in a Blob
	const blob = await downloadZip([obj, mtl]).blob();
  
	// make and click a temporary link to download the Blob
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = fileName + ".zip";
	link.click();
	link.remove();
  
	// in real life, don't forget to revoke your Blob URLs if you use them
  }

//get string data for obj
function saveObj() {
	let objString = getObjString();

	const stringToBlob = new Blob([objString], { type: 'text/plain' });
	return stringToBlob;
}

//get string data for mtl
function saveMtl() {
	let mtlString = getMtlString();

	const stringToBlob = new Blob([mtlString], { type: 'text/plain' });
	return stringToBlob;
}

//create vert, face, and mtl data for a pixel at a position of the image
function createCubeAtPosition(x, y, rgba) {
	let posOffset = objVertices.length;
	objVertices.push([x, y + 1, 1]);
	objVertices.push([x, y, 1]);
	objVertices.push([x + 1, y, 1]);
	objVertices.push([x + 1, y + 1, 1]);
	objVertices.push([x, y + 1, 0]);
	objVertices.push([x, y, 0]);
	objVertices.push([x + 1, y, 0]);
	objVertices.push([x + 1, y + 1, 0]);
	
	findOrCreateMtl(rgba, objFaces.length);
	objFaces.push([(1+posOffset), (2+posOffset), (3+posOffset), (4+posOffset)]);
	objFaces.push([(8+posOffset), (7+posOffset), (6+posOffset), (5+posOffset)]);
	objFaces.push([(4+posOffset), (3+posOffset), (7+posOffset), (8+posOffset)]);
	objFaces.push([(5+posOffset), (1+posOffset), (4+posOffset), (8+posOffset)]);
	objFaces.push([(5+posOffset), (6+posOffset), (2+posOffset), (1+posOffset)]);
	objFaces.push([(2+posOffset), (6+posOffset), (7+posOffset), (3+posOffset)]);

}

//converts cached data into a string that can be saved as a .obj
function getObjString() {
	let objString = "# cube.obj\r\n#\r\n\r\nmtllib " + fileName + ".mtl\r\n\r\ng cube\r\n\r\n";
	for (let v=0;v<objVertices.length;v++) {
		let vert = objVertices[v];
		objString += `v ${vert[0]} ${vert[1]} ${vert[2]}\r\n`;
	}
	for (let m=0;m<objMtl.length;m++)
	{
		objString += `g ${objMtl[m][1]}\r\nusemtl ${objMtl[m][1]}\r\n`;
		for (let p=0;p<objMtl[m][2].length;p++)
		{
			let offset = objMtl[m][2][p];
			for (let side=0;side<6;side++)
			{
				let face = objFaces[offset+side];
				objString += `f ${face[0]} ${face[1]} ${face[2]} ${face[3]}\r\n`;
			}
		}
	}
	return objString;
}


//converts cached mtl data into a string that can be saved as a .mtl material library
function getMtlString() {
	let mtlString = "";
	for (let m=0; m<objMtl.length; m++) {
		mtlString += `newmtl ${objMtl[m][1]}\r\n`;
		mtlString += 'illum 1\r\n';
		mtlString += `Ka ${objMtl[m][0][0] / 255} ${objMtl[m][0][1] / 255} ${objMtl[m][0][2] / 255}\r\n`
		mtlString += `Kd ${objMtl[m][0][0] / 255} ${objMtl[m][0][1] / 255} ${objMtl[m][0][2] / 255}\r\n`
	}
	return mtlString;
}

//check if we have a material for this color yet, and if not create one with a generated name
function findOrCreateMtl(rgba, posOffset)
{
	let mtlName = null;
	for (var i=0;i<objMtl.length;i++) {
		if (objMtl[i][0][0] == rgba[0] && objMtl[i][0][1] == rgba[1] && objMtl[i][0][2] == rgba[2]) {
			objMtl[i][2].push(posOffset);
			return i;
		}
	}
	if (mtlName == null) {
		//generates a name. currently the name can be pretty limited
		//TODO: refactor name generator to allow for any amount of colors
		mtlName = "mat";
		let nIndex = objMtl.length;
		let firstIndex = Math.floor(nIndex / mtlNames.length);
		let secondIndex = nIndex % mtlNames.length;
		let offsetArr = [posOffset];
		mtlName += mtlNames[firstIndex];
		mtlName += mtlNames[secondIndex];
		objMtl.push([rgba, mtlName, offsetArr]);
	}
}

//toggle visibility of settings popup
function toggleSettings() {
	let settings = document.getElementById('settings-popup');
	settings.style.visibility = settings.style.visibility == 'hidden' ? 'visible' : 'hidden';
}

//wip system for setting a partial rect of an image to be used instead of whole image for generating model
function updateRect() {
	canvasPosX = parseInt(document.getElementById('x-setter').value);
	canvasPosY = parseInt(document.getElementById('y-setter').value);
	canvasWidth = parseInt(document.getElementById('width').value);
	canvasHeight = parseInt(document.getElementById('height').value);
	let preview = document.getElementById('imagepreview');
	let canvas = document.getElementById('canvas');
	let context = canvas.getContext('2d');
	let ctx = preview.getContext('2d');
	context.clearRect(0, 0, canvas.width, canvas.height);
	ctx.clearRect(0, 0, preview.width, preview.height);
	preview.height = canvasHeight;
	preview.width = canvasWidth;
	canvas.height = canvasHeight;
	canvas.width = canvasWidth;
	ctx.drawImage(output, canvasPosX, canvasPosY);
	context.drawImage(output, canvasPosX, canvasPosY)
}

//update preview canvas background color based off settings. useful if you need contrast from your sprite when previewing, but has no effect on the model
function updateBackground(colorPicker) {
	let canvas = document.getElementById('imagepreview');
	let color = colorPicker.target.value;
	canvas.style.backgroundColor = color;
}

//an array of all vertices in the mesh represented with nested arrays of [x, y, z]
let objVertices = [];
//an array of nested arrays that represent various parts of a matial, represented by [color, material name, [cubes that use material]]
let objMtl = [];
//an array of the faces of the material, represented by nested arrays of each vertice (corner) that makes up the face, [vert1, vert2, vert3, vert4]
let objFaces = [];
//temporarily used for generating material names, will need to be refactored
const mtlNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
//img that normally is hidden
let output = null;
//name of .obj and .mtl file to save as, default set to name of image uploaded
let fileName = "";
//caching for wip setting for region/rect selection for conversion
let canvasPosX = 0;
let canvasPosY = 0;
let canvasWidth = 0;
let canvasHeight = 0;
          