window.addEventListener("load", function () {

    var fileSystem = null;
    var viewImage = document.getElementById("viewImage");
    var Breadcrumb = document.getElementById("Breadcrumb")
    var deleteBtn = document.getElementById("delete")
    var current = null;
    var deleteFolder=[];
    var deleteImg=[];


    requestFileSystem();


    deleteBtn.onclick = function(){

        for (let index = 0; index < deleteFolder.length; index++) {
            
            deleteEntry(deleteFolder[index],1)
            
            if(deleteFolder.length-1 == index){

				setTimeout(function(){
                    console.log(document.getElementById("Breadcrumb").childNodes)
                    document.getElementById("Breadcrumb").childNodes[1].remove();

                    readFiles(fileSystem.root);

				},100);
            }
            
        }

        for (let index = 0; index < deleteImg.length; index++){

            deleteEntry(deleteImg[index],2)

            if(deleteImg.length-1 == index){
				setTimeout(function(){
                    
                    let temp = document.getElementById("Breadcrumb").childNodes;

                    temp[temp.length-1].remove();
                    

                    getDirectoryEntry(current);
                    
				},100);
			}

        }


    }

    function deleteEntry(path,parameter){

        if(parameter === 1){

            fileSystem.root.getDirectory(path, { create: false }, function (dirEntry) {

                dirEntry.removeRecursively(function() {});
            
            });

        }else if (parameter === 2){

            fileSystem.root.getFile(path, { create: false }, function (fileEntry) {
                
                console.log(fileEntry)
                fileEntry.remove(function() {});

            });

        }


    }

    function imgFolderClick() {

        let imgElements = document.getElementById("viewImage").getElementsByClassName("imgFolder")
        var timer = null;

        for (let element of imgElements) {

            element.addEventListener('click', function (event) {

                clearTimeout(timer);
                let id = this.id
                timer = setTimeout(function () {

                    current = id ;
                    getDirectoryEntry(id)

                }, 300)


            })

            element.addEventListener('dblclick', function (event) {

                clearTimeout(timer);

                let index = deleteFolder.indexOf(this.id);

                if (index> -1) {

                    this.style.backgroundColor="white"

                    deleteFolder.splice(index, 1);
                }else{
                    
                    this.style.backgroundColor="#f3f3f3"
                    
                    deleteFolder.push(this.id)
                }

                console.log(deleteFolder)

            })
        }



        $(".pathBtn").unbind('click');
        $(".pathBtn").click(function () {
            if (this.id == '/') {
                $("#Breadcrumb").empty();
                readFiles(fileSystem.root);
            } else {


            }

        })


    }


    function imageDoubleClick() {

        let imgElements = document.getElementById("viewImage").getElementsByClassName("imgClick")


        for (let element of imgElements) {

            element.addEventListener('dblclick', function (event) {

                let index = deleteImg.indexOf(this.dataset.fullpath);

                if (index> -1) {

                    this.style.backgroundColor="white"
                    this.style.border="";

                    deleteImg.splice(index, 1);
                }else{
                    
                    this.style.backgroundColor="#f3f3f3"
                    this.style.border="1px red solid";

                    deleteImg.push(this.dataset.fullpath)
                }

                console.log(deleteImg)


            })


        }




    }


    function getDirectoryEntry(path) {

        fileSystem.root.getDirectory(path, { create: true }, function (dirEntry) {
            readFiles(dirEntry);
        });

    }

    function readFiles(DirectoryEntry) {
        
        

        let pathBtn = document.createElement("div")
        let path = DirectoryEntry.fullPath;

        pathBtn.className = "pathBtn"
        pathBtn.innerText = path;
        pathBtn.id = path
        Breadcrumb.appendChild(pathBtn)

        $("#viewImage").empty();
        var reader = DirectoryEntry.createReader();

        var readEntries = function () {

            reader.readEntries(function (entries) {

                //readEntries 一次最多只會read 100個 entries 出來
                if (!entries.length) {


                    

                    deleteFolder=[];
                    deleteImg=[];
                    imageDoubleClick();
                    imgFolderClick();
                    console.log('Read end')

                } else if (entries.length) {
                    entries.forEach(function (element) {
                        //console.log(element)
                        if (element.isFile) {

                            let src = element.toURL();
                            let id = element.name.split(".")[0];
                            let imgEle = document.createElement("img");

                            let imgDiv = document.createElement("div");
                            let imgTitle = document.createElement("span");

                            imgEle.src = src
                            imgEle.id = id;
                            imgEle.className = 'imgClick';
                            imgEle.dataset.fullpath = element.fullPath;

                            imgTitle.innerHTML = element.name

                            imgDiv.className = "imgDiv"
                            imgDiv.appendChild(imgTitle)
                            imgDiv.appendChild(imgEle)


                            viewImage.appendChild(imgDiv)

                        } else if (element.isDirectory) {

                            let id = element.name.split(".")[0];
                            let imgEle = document.createElement("img");
                            imgEle.src = 'img/folder.png';

                            let imgTitle = document.createElement("span");
                            imgTitle.innerHTML = element.name;

                            let imgDiv = document.createElement("div");
                            imgDiv.id = element.fullPath;

                            imgDiv.className = "imgFolder"
                            imgDiv.appendChild(imgTitle)
                            imgDiv.appendChild(imgEle)
                            viewImage.appendChild(imgDiv)


                        }


                    });

                    readEntries();
                }

            }, function (error) {
                /* handle error -- error is a FileError object */
            });

        };

        readEntries();


    }



    function requestFileSystem() {

        window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

        var requestedBytes = 1024 * 1024 * 550; //550MB

        navigator.webkitPersistentStorage.requestQuota(
            requestedBytes,
            function (grantedBytes) {
                window.requestFileSystem(PERSISTENT, grantedBytes, function (fs) {

                    fileSystem = fs;
                    readFiles(fs.root)

                }, function () {
                    console.log('Error');
                });
            },
            function (e) {
                console.log('Error', e);
            }
        );


        navigator.webkitPersistentStorage.queryUsageAndQuota(function (usage, quota) {
            //usage已經使用的空間，quota申請的總空間
            if (!quota) {
                //還沒有申請過空間
                console.log("nono");
            } else {
                console.log("presence");
                console.log("Total:" + quota);
                console.log("Usage:" + usage);
            }
        });

    }
















})