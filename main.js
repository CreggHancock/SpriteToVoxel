
function onLoad() {
	document.getElementById('convert').disabled = true;
	document.getElementById('save').disabled = true;
	document.getElementById('save-label').innerHTML = "";
	document.getElementById('upload').value = "";
}

function openFile(file) {
	var input = file.target;
	output = document.getElementById('output');
	var preview = document.getElementById('imagepreview');
	var canvas = document.getElementById('canvas');
	var context = canvas.getContext('2d');
	var ctx = preview.getContext('2d');
	context.clearRect(0, 0, canvas.width, canvas.height);
	ctx.clearRect(0, 0, preview.width, preview.height);
    var reader = new FileReader();
    reader.onload = function(){
		var dataURL = reader.result;
		output.src = dataURL;
		objNormals = [];
		objVertices = [];
		objFaces = [];
		matMaps = [];
	};
	let nameArr = input.files[0].name.split(".");
	fileName = nameArr[0];
	console.log("input " + fileName);
	reader.readAsDataURL(input.files[0]);
	output.onload = function(){
		preview.width = output.width;
		preview.height = output.height;
		ctx.drawImage(output, 0, 0);
		document.getElementById('convert').disabled = false;
		document.getElementById('save').disabled = true;
		document.getElementById('save-label').innerHTML = "Ready to convert";
	}
  }

function convertToObj() {
	var canvas = document.getElementById('canvas');
	canvas.width = output.width;
	canvas.height = output.height;
	var context = canvas.getContext('2d');
	context.transform(1, 0, 0, -1, 0, canvas.height)
	context.drawImage(output, 0, 0 );
	document.getElementById('convert').disabled = true;
	document.getElementById('save').disabled = false;
	document.getElementById('save-label').innerHTML = "Conversion Successful";
	for (var x=0;x<output.width;x++)
	{
		for (var y=0;y<output.height;y++)
		{
			var data = context.getImageData(x, y, 1, 1).data;
			if (data[3] == 0)
			{
				continue;
			}
			var rgba = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
			createCubeAtPosition(x, y, data)
		}
	}
}

function saveModel() {
	let matBlob = saveMtl();
	let objBlob = saveObj();
	downloadTestZip(matBlob, objBlob);
}

async function downloadTestZip(mtlContent, objContent) {
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

function saveObj() {
	let objString = getObjString();

	const stringToBlob = new Blob([objString], { type: 'text/plain' });
	return stringToBlob;
}

function saveMtl() {
	let mtlString = getMtlString();

	const stringToBlob = new Blob([mtlString], { type: 'text/plain' });
	return stringToBlob;
}

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
	
	var mtlIndex = findOrCreateMtl(rgba, posOffset);
	matMaps.push(mtlIndex);
	objFaces.push([(1+posOffset), (2+posOffset), (3+posOffset), (4+posOffset)]);
	objFaces.push([(8+posOffset), (7+posOffset), (6+posOffset), (5+posOffset)]);
	objFaces.push([(4+posOffset), (3+posOffset), (7+posOffset), (8+posOffset)]);
	objFaces.push([(5+posOffset), (1+posOffset), (4+posOffset), (8+posOffset)]);
	objFaces.push([(5+posOffset), (6+posOffset), (2+posOffset), (1+posOffset)]);
	objFaces.push([(2+posOffset), (6+posOffset), (7+posOffset), (3+posOffset)]);

}

function getObjString() {
	console.log(`vert length is ${objVertices.length}, face length is ${objFaces.length}`);
	var objString = "# cube.obj\r\n#\r\n\r\nmtllib " + fileName + ".mtl\r\n\r\ng cube\r\n\r\n";
	for (let v=0;v<objVertices.length;v++) {
		let vert = objVertices[v];
		objString += `v ${vert[0]} ${vert[1]} ${vert[2]}\r\n`;
	}
	for (let f=0;f<objFaces.length;f++) {
		if (f % 6 === 0) {
			let mappedIndex = matMaps[f / 6];
			objString += `g ${objMtl[mappedIndex][1]}\r\nusemtl ${objMtl[mappedIndex][1]}\r\n`;
		}
		let face = objFaces[f];
		objString += `f ${face[0]} ${face[1]} ${face[2]} ${face[3]}\r\n`;
	}
	return objString;
}

function getMtlString() {
	var mtlString = "";
	for (var m=0; m<objMtl.length; m++) {
		mtlString += `newmtl ${objMtl[m][1]}\r\n`;
		mtlString += 'illum 1\r\n';
		mtlString += `Ka ${objMtl[m][0][0] / 255} ${objMtl[m][0][1] / 255} ${objMtl[m][0][2] / 255}\r\n`
		mtlString += `Kd ${objMtl[m][0][0] / 255} ${objMtl[m][0][1] / 255} ${objMtl[m][0][2] / 255}\r\n`
	}
	return mtlString;
}

function findOrCreateMtl(rgba, posOffset)
{
	var mtlName = null;
	var mtlIndex = 0;
	for (var i=0;i<objMtl.length;i++) {
		if (objMtl[i][0][0] == rgba[0] && objMtl[i][0][1] == rgba[1] && objMtl[i][0][2] == rgba[2]) {
			return i;
		}
	}
	if (mtlName == null) {
		mtlIndex = objMtl.length;
		mtlName = "mat";
		var nIndex = objMtl.length;
		var firstIndex = Math.floor(nIndex / mtlNames.length);
		var secondIndex = nIndex % mtlNames.length;
		mtlName += mtlNames[firstIndex];
		mtlName += mtlNames[secondIndex];
		objMtl.push([rgba, mtlName]);
	}
	return mtlIndex;
}

let objVertices = [];
let objMtl = [];
let matMaps = [];
let objFaces = [];
let mtlNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
let output = null;
let fileName = "";
          