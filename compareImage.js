window.addEventListener('load', function () {

    var url = location.href;
    var paperId = null;
    var fileSystem = null;
    var selectOneImageId = null;
    var lastSelectOneImage = new Object();
    var selectMultipleImage = [];
    var selectMultipleImageId = [];
    var thumbnail = document.getElementById("thumbnail");
    var oneImage = document.getElementById("oneImage")
    oneImage.style.left = "0px"
    oneImage.style.top = "0px"
    oneImage.style.position = "relative"
    var oneImageDiv = document.getElementById("oneImageDiv")
    var rotateBtn = document.getElementById("rotate")
    var zoomNumber = document.getElementById("zoomNumber")
    var zoomSlider = document.getElementById("zoomSlider")
    var questionNumber = document.getElementById("questionNumber")
    var clearBtn = document.getElementById("clear")
    var compareBox = document.getElementById("compareBox")
    var compareNumber = document.getElementById("compareNumber")
    let compareDiv1 = document.getElementById("compareDiv1")
    var degree = 0;
    var lastNum = 0;
    var gScale = 0;

    if (url.indexOf('?') != -1) {
        var ary = url.split('?')[1].split('&');
        for (i = 0; i <= ary.length - 1; i++) {
            if (ary[i].split('=')[0] == 'paperId')
                paperId = ary[i].split('=')[1];
        }
    } else {
        paperId = 'A4';
    }

    for (let i = 1; i <= 16; i++) {

        let option = document.createElement("option")
        option.value = i - 1;
        option.innerHTML = i;
        questionNumber.appendChild(option)


    }

    requestFileSystem();

    compareBox.onchange = function () {


        if (this.checked) {

            compareDiv1.style.display = 'flex';
            oneImageDiv.style.display = 'none'

            $(".thumbnailImg").css("opacity", '0.5');
            console.log(1)

        } else {


            compareDiv1.style.display = 'none';
            oneImageDiv.style.display = 'flex'

            $(".thumbnailImg").css("opacity", '0.5');
            lastSelectOneImage.style.opacity = '1.0';

            console.log(0)
        }




    }

    clearBtn.onclick = function () {

        reset()

    }

    rotateBtn.onclick = function () {


        if (compareBox.checked) {


            let mulImgDiv = document.getElementsByClassName("compareDiv");

            degree = degree + 90;

            if (degree == 360)
                degree = 0

            for (let i = 0; i < mulImgDiv.length; i++) {

                let rotateScale = '';
                if (mulImgDiv[i].clientWidth > mulImgDiv[i].clientHeight)
                    rotateScale = mulImgDiv[i].clientHeight / mulImgDiv[i].clientWidth
                else if (mulImgDiv[i].clientWidth < mulImgDiv[i].clientHeight)
                    rotateScale = mulImgDiv[i].clientHeight / mulImgDiv[i].clientWidth

                rotateScale = rotateScale.toFixed(2);


                if (degree == 0 || degree == 180) {
                    mulImgDiv[i].style.transform = 'scale(1.0) rotate(' + degree + 'deg)'
                } else if (degree == 90 || degree == 270) {
                    mulImgDiv[i].style.transform = 'scale(' + rotateScale + ') rotate(' + degree + 'deg)'
                }


            }



        } else {

            //只控制oneImageDiv的 scale 和 degree
            let rotateScale = '';
            if (oneImageDiv.clientWidth > oneImageDiv.clientHeight)
                rotateScale = oneImageDiv.clientHeight / oneImageDiv.clientWidth
            else if (oneImageDiv.clientWidth < oneImageDiv.clientHeight)
                rotateScale = oneImageDiv.clientHeight / oneImageDiv.clientWidth

            rotateScale = rotateScale.toFixed(2);

            degree = degree + 90;


            if (degree == 360)
                degree = 0

            console.log(degree)

            if (degree == 0 || degree == 180) {
                oneImageDiv.style.transform = 'scale(1.0) rotate(' + degree + 'deg)'
            } else if (degree == 90 || degree == 270) {
                oneImageDiv.style.transform = 'scale(' + rotateScale + ') rotate(' + degree + 'deg)'
            }

        }


    }


    var onmousewheelValue = 10, maxX, maxY;
    var maxLimit = true;

    oneImage.onmousemove = function (e) {

        if (maxLimit) {
            maxX = e.offsetX;
            maxY = e.offsetY;
        }
        // console.log(e)

    }


    oneImage.onmousewheel = function (e) {

        //放大
        if (e.deltaY < 0) {

            onmousewheelValue += 1;

            let mValue = (onmousewheelValue / 10).toFixed(1)

            gScale = mValue
            console.log(gScale)

            oneImage.style.transform = "scale(" + mValue + ") rotate(0deg)";


            console.log(e)
            console.log(e.offsetX)

            console.log(oneImageDiv.getBoundingClientRect().width)
            console.log(maxX / oneImageDiv.getBoundingClientRect().width * 100)

            let OriginString = e.offsetX + "px " + e.offsetY + "px";
            oneImage.style.transformOrigin = OriginString

            // console.log(oneImageDiv.getBoundingClientRect().height)
            // console.log(maxY / oneImageDiv.getBoundingClientRect().height * 100)

            zoomNumber.innerHTML = (onmousewheelValue / 10).toFixed(1) + "X"

            zoomSlider.value = (onmousewheelValue / 10).toFixed(1) * 10;

        } else {

            onmousewheelValue -= 1;

            if (onmousewheelValue < 10)
                onmousewheelValue = 10


            let OriginString = e.offsetX + "px " + e.offsetY + "px";
            oneImage.style.transformOrigin = OriginString

            if (onmousewheelValue == 10) {
                oneImage.style.left = "0px"
                oneImage.style.top = "0px"
                oneImage.style.transform = "scale(" + 1 + ") rotate(0deg)"
                zoomNumber.innerHTML = '1.0' + "X"

                zoomSlider.value = 10;
                // $(".compareImg").css("transform", "scale(" + 1 + ")");

            } else if (onmousewheelValue > 10) {

                let currentLeft = parseFloat(oneImage.style.left);
                let offsetLeft = currentLeft / (onmousewheelValue - 10 + 1)
                let currentTop = parseFloat(oneImage.style.top);
                let offsetTop = currentTop / (onmousewheelValue - 10 + 1)
                oneImage.style.left = currentLeft + (offsetLeft * -1) + "px";
                oneImage.style.top = currentTop + (offsetTop * -1) + "px";
                oneImage.style.transform = "scale(" + onmousewheelValue / 10 + ") rotate(0deg)"
                zoomNumber.innerHTML = (onmousewheelValue / 10).toFixed(1) + "X"

                zoomSlider.value = (onmousewheelValue / 10).toFixed(1) * 10;

                // $(".compareImg").css("transform", "scale(" + (val / 10).toFixed(1) + ")");
            }

        }


        return false;

    }

    zoomSlider.oninput = function () {

        let val = this.value;

        if (lastNum < val) {
            //數值上升
            oneImage.style.transform = "scale(" + (val / 10).toFixed(1) + ") rotate(0deg)"
            zoomNumber.innerHTML = (val / 10).toFixed(1) + "X"

            // $(".compareImg").css("transform", "scale(" + (val / 10).toFixed(1) + ")");

        } else {
            //數值下降
            if (val == 10) {
                oneImage.style.left = "0px"
                oneImage.style.top = "0px"
                oneImage.style.transform = "scale(" + 1 + ") rotate(0deg)"
                zoomNumber.innerHTML = '1.0' + "X"
                // $(".compareImg").css("transform", "scale(" + 1 + ")");

            } else if (val > 10) {

                let currentLeft = parseFloat(oneImage.style.left);
                let offsetLeft = currentLeft / (val - 10 + 1)
                let currentTop = parseFloat(oneImage.style.top);
                let offsetTop = currentTop / (val - 10 + 1)
                oneImage.style.left = currentLeft + (offsetLeft * -1) + "px";
                oneImage.style.top = currentTop + (offsetTop * -1) + "px";
                oneImage.style.transform = "scale(" + val / 10 + ") rotate(0deg)"
                zoomNumber.innerHTML = (val / 10).toFixed(1) + "X"

                // $(".compareImg").css("transform", "scale(" + (val / 10).toFixed(1) + ")");
            }


        }
        lastNum = val;
    }

    $("#compareNumber").change(function () {

        selectMultipleImage = [];
        selectMultipleImageId = []

    })

    $("#questionNumber").change(function (event) {

        oneImage.style.top = "0";
        oneImage.style.left = "0";
        oneImage.style.transform = "scale(1.0)"
        oneImage.style.transformOrigin = ''
        lastNum = 0;

        if (compareBox.checked) {

            mulImageScale(this.value)

        } else {

            imageScale(this.value)
        }


    })

    function reset() {

        oneImageDiv.style.transform = "scale(" + 1 + ") rotate(" + 0 + "deg)"
        oneImage.style.left = '0px'
        oneImage.style.top = '0px'
        oneImage.style.transform = "scale(" + 1 + ") rotate(" + 0 + "deg)"
        oneImage.style.position = "relative"
        // degree = 0;
        lastNum = 0;
        zoomNumber.innerHTML = '1.0' + "X"
        zoomSlider.value = 10;

        $(".compareImg").css("position", "relative");
        $(".compareImg").css("left", "0px");
        $(".compareImg").css("top", "0px");
        $(".compareImg").css("transform", "scale(" + 1 + ")");
    }

    function thumbnailClick() {
        $(".thumbnailImg").unbind("click");
        $(".thumbnailImg").bind("click", function (event) {

            $(".thumbnailImg").css("opacity", '0.5');

            if (compareBox.checked) {

                let total = parseInt(compareNumber.value)
                if (selectMultipleImage.length <= total) {
                    if (selectMultipleImage.length == total) {
                        selectMultipleImage.shift();
                        selectMultipleImageId.shift();
                    }
                    selectMultipleImage.push(this);
                    selectMultipleImageId.push(this.id);

                }

                appendCompareImage(selectMultipleImage.length);
                // console.log(selectMultipleImageId);
                // console.log(selectMultipleImage);

            } else {

                selectOneImageId = this.id;
                lastSelectOneImage = this;

                oneImage.src = this.childNodes[1].src


                oneImageLoad();
                reset();

                this.style.opacity = '1.0';

            }

        });
    }

    function appendCompareImage(imgLength) {

        $("#compareDiv1").empty();

        for (let i = 0; i < selectMultipleImage.length; i++) {

            let img = document.createElement("img");
            img.className = "compareImg"
            img.src = selectMultipleImage[i].childNodes[1].src;
            img.id = selectMultipleImage[i].childNodes[1].id;

            let compareDiv = document.createElement("div");

            compareDiv.className = "compareDiv"
            compareDiv.appendChild(img);
            compareDiv1.appendChild(compareDiv);

            selectMultipleImage[i].style.opacity = '1';
        }


        let multiImgEle = document.getElementsByClassName("compareDiv");


        for (let i = imgLength - 1; i >= 0; i--) {


            if (multiImgEle[i].firstChild.naturalHeight > multiImgEle[i].firstChild.naturalWidth) {

                let rscale = multiImgEle[i].firstChild.naturalWidth / multiImgEle[i].firstChild.naturalHeight;

                multiImgEle[i].style.height = rscale * multiImgEle[i].clientWidth + 'px';

                multiImgEle[i].style.width = rscale * rscale * multiImgEle[i].clientWidth + 'px';


            }

            if (i == multiImgEle.length - 1) {

                imageMouseMove(2);
                $(".compareImg").css("position", "relative");
                $(".compareImg").css("left", "0px");
                $(".compareImg").css("top", "0px");

            }


        }



    }

    function mulImageScale(imgNumber) {


        let mulCompareImg = document.getElementsByClassName("compareImg");


        for (let i = 0; i < mulCompareImg.length; i++) {


            console.log(mulCompareImg[i].id)
            console.log(mulCompareImg[i].width)
            console.log(mulCompareImg[i].naturalWidth)

            // 瀏覽器圖片實際移動的時要乘上的倍率
            let scaleRatio = mulCompareImg[i].width / mulCompareImg[i].naturalWidth
            let imgData = JSON.parse(localStorage.getItem(mulCompareImg[i].id));
            let scale;
            let scale1 = mulCompareImg[i].height / (imgData['imgInfo'][imgNumber]['cntInfo']['boundingRect'].height * scaleRatio)
            let scale2 = mulCompareImg[i].width / (imgData['imgInfo'][imgNumber]['cntInfo']['boundingRect'].width * scaleRatio)


            if (scale1 < scale2)
                scale = scale1
            else
                scale = scale2

            scale = scale.toFixed(3);
            zoomNumber.innerHTML = parseFloat(scale).toFixed(1) + "x"
            zoomSlider.value = scale * 10;
            lastNum = scale * 10;

            let oneImageCenterX = mulCompareImg[i].width / 2;
            let oneImageCenterY = mulCompareImg[i].height / 2;

            let offsetX = (imgData['imgInfo'][imgNumber]['cntInfo']['center'].x * scaleRatio)
            let offsetY = (imgData['imgInfo'][imgNumber]['cntInfo']['center'].y * scaleRatio)

            offsetX = offsetX - oneImageCenterX;
            offsetY = offsetY - oneImageCenterY;

            //只控制oneImage的 scale 和 left 和 top
            mulCompareImg[i].style.left = '0px'
            mulCompareImg[i].style.top = '0px'
            mulCompareImg[i].style.transform = "scale(" + scale + ") rotate(" + 0 + "deg)"

            if (degree == 90 || degree == 270) {
                let rotateScale = mulCompareImg[i].naturalHeight / mulCompareImg[i].naturalWidth;

                limitBorderX = (mulCompareImg[i].getBoundingClientRect().height - mulCompareImg[i].parentNode.getBoundingClientRect().height) / 2;
                limitBorderX = limitBorderX / rotateScale;
                limitBorderX = limitBorderX.toFixed(0);

                limitBorderY = (mulCompareImg[i].getBoundingClientRect().height - mulCompareImg[i].parentNode.getBoundingClientRect().height) / 2;
                limitBorderY = limitBorderY.toFixed(0);

                let moveOffsetX = -1 * scale * offsetX;

                if (moveOffsetX >= limitBorderX) {
                    /* 頂到左側停住 */
                    let borderMax = limitBorderX + "px";
                    mulCompareImg[i].style.left = borderMax;
                } else if (moveOffsetX <= (limitBorderX * -1)) {
                    /* 頂到右側停住 */
                    let borderMax = (limitBorderX * -1) + "px";
                    mulCompareImg[i].style.left = borderMax;
                } else {
                    mulCompareImg[i].style.left = moveOffsetX + "px"
                }

                let moveOffsetY = -1 * scale * offsetY;

                if (moveOffsetY >= limitBorderY) {
                    /* 頂到上側停住 */
                    let borderS = limitBorderY + "px";
                    mulCompareImg[i].style.top = borderS;
                } else if (moveOffsetY <= (limitBorderY * -1)) {
                    /* 頂到下側停住 */
                    let borderS = (limitBorderY * -1) + "px";
                    mulCompareImg[i].style.top = borderS;
                } else {
                    /* 介於中間自由移動 */
                    mulCompareImg[i].style.top = moveOffsetY + "px";
                }



            } else if (degree == 0 || degree == 180) {


                limitBorderX = (mulCompareImg[i].getBoundingClientRect().width - mulCompareImg[i].parentNode.clientWidth) / 2;
                limitBorderX = limitBorderX.toFixed(0);

                limitBorderY = (mulCompareImg[i].getBoundingClientRect().height - mulCompareImg[i].parentNode.clientHeight) / 2;
                limitBorderY = limitBorderY.toFixed(0);

                let moveOffsetX = -1 * scale * offsetX;

                if (moveOffsetX >= limitBorderX) {
                    /* 頂到左側停住 */
                    let borderMax = limitBorderX + "px";
                    mulCompareImg[i].style.left = borderMax;
                } else if (moveOffsetX <= (limitBorderX * -1)) {
                    /* 頂到右側停住 */
                    let borderMax = (limitBorderX * -1) + "px";
                    mulCompareImg[i].style.left = borderMax;
                } else {
                    mulCompareImg[i].style.left = moveOffsetX + "px"
                }

                let moveOffsetY = -1 * scale * offsetY;
                if (moveOffsetY >= limitBorderY) {
                    /* 頂到上側停住 */
                    let borderMax = limitBorderY + "px";
                    mulCompareImg[i].style.top = borderMax;
                } else if (moveOffsetY <= (limitBorderY * -1)) {
                    /* 頂到下側停住 */
                    let borderMax = (limitBorderY * -1) + "px";
                    mulCompareImg[i].style.top = borderMax;
                } else {
                    mulCompareImg[i].style.top = moveOffsetY + "px"
                }



            }



        }
    }

    function imageScale(imgNumber) {

        // 瀏覽器圖片實際移動的時要乘上的倍率
        let scaleRatio = oneImage.width / oneImage.naturalWidth
        let imgData = JSON.parse(localStorage.getItem(selectOneImageId));
        let scale;
        let scale1 = oneImage.height / (imgData['imgInfo'][imgNumber]['cntInfo']['boundingRect'].height * scaleRatio)
        let scale2 = oneImage.width / (imgData['imgInfo'][imgNumber]['cntInfo']['boundingRect'].width * scaleRatio)

        if (scale1 < scale2)
            scale = scale1
        else
            scale = scale2

        scale = scale.toFixed(3);
        zoomNumber.innerHTML = parseFloat(scale).toFixed(1) + "x"
        zoomSlider.value = scale * 10;
        lastNum = scale * 10;

        let oneImageCenterX = oneImage.width / 2;
        let oneImageCenterY = oneImage.height / 2;

        let offsetX = (imgData['imgInfo'][imgNumber]['cntInfo']['center'].x * scaleRatio)
        let offsetY = (imgData['imgInfo'][imgNumber]['cntInfo']['center'].y * scaleRatio)

        offsetX = offsetX - oneImageCenterX;
        offsetY = offsetY - oneImageCenterY;

        //只控制oneImage的 scale 和 left 和 top
        oneImage.style.left = '0px'
        oneImage.style.top = '0px'
        oneImage.style.transform = "scale(" + scale + ") rotate(" + 0 + "deg)"

        let limitBorderX, limitBorderY;

        if (degree == 90 || degree == 270) {
            let rotateScale = oneImage.naturalHeight / oneImage.naturalWidth;

            limitBorderX = (oneImage.getBoundingClientRect().height - oneImageDiv.getBoundingClientRect().height) / 2;
            limitBorderX = limitBorderX / rotateScale;
            limitBorderX = limitBorderX.toFixed(0);

            limitBorderY = (oneImage.getBoundingClientRect().height - oneImageDiv.getBoundingClientRect().height) / 2;
            limitBorderY = limitBorderY.toFixed(0);

            let moveOffsetX = -1 * scale * offsetX;

            if (moveOffsetX >= limitBorderX) {
                /* 頂到左側停住 */
                let borderMax = limitBorderX + "px";
                oneImage.style.left = borderMax;
            } else if (moveOffsetX <= (limitBorderX * -1)) {
                /* 頂到右側停住 */
                let borderMax = (limitBorderX * -1) + "px";
                oneImage.style.left = borderMax;
            } else {
                oneImage.style.left = moveOffsetX + "px"
            }

            let moveOffsetY = -1 * scale * offsetY;

            if (moveOffsetY >= limitBorderY) {
                /* 頂到上側停住 */
                let borderS = limitBorderY + "px";
                oneImage.style.top = borderS;
            } else if (moveOffsetY <= (limitBorderY * -1)) {
                /* 頂到下側停住 */
                let borderS = (limitBorderY * -1) + "px";
                oneImage.style.top = borderS;
            } else {
                /* 介於中間自由移動 */
                oneImage.style.top = moveOffsetY + "px";
            }

        } else if (degree == 0 || degree == 180) {


            limitBorderX = (oneImage.getBoundingClientRect().width - oneImageDiv.clientWidth) / 2;
            limitBorderX = limitBorderX.toFixed(0);

            limitBorderY = (oneImage.getBoundingClientRect().height - oneImageDiv.clientHeight) / 2;
            limitBorderY = limitBorderY.toFixed(0);

            let moveOffsetX = -1 * scale * offsetX;

            if (moveOffsetX >= limitBorderX) {
                /* 頂到左側停住 */
                let borderMax = limitBorderX + "px";
                oneImage.style.left = borderMax;
            } else if (moveOffsetX <= (limitBorderX * -1)) {
                /* 頂到右側停住 */
                let borderMax = (limitBorderX * -1) + "px";
                oneImage.style.left = borderMax;
            } else {
                oneImage.style.left = moveOffsetX + "px"
            }

            let moveOffsetY = -1 * scale * offsetY;
            if (moveOffsetY >= limitBorderY) {
                /* 頂到上側停住 */
                let borderMax = limitBorderY + "px";
                oneImage.style.top = borderMax;
            } else if (moveOffsetY <= (limitBorderY * -1)) {
                /* 頂到下側停住 */
                let borderMax = (limitBorderY * -1) + "px";
                oneImage.style.top = borderMax;
            } else {
                oneImage.style.top = moveOffsetY + "px"
            }


        }
    }

    function imageMouseMove(moveParameter) {

        let clicking = false, startX = 0, startY = 0;
        let moveObject = new Object;
        let bindObject = new Object;

        if (moveParameter === 1) {
            moveObject = oneImage;
            bindObject = $("#oneImage")
        } else if (moveParameter === 2) {
            moveObject = $(".compareImg");
            bindObject = $("#compareDiv1")
        }


        bindObject.unbind("mousedown");
        bindObject.bind("mousedown", function (event) {
            event.preventDefault();
            clicking = true;
            startX = event.offsetX;
            startY = event.offsetY;
            maxLimit = false;

        });

        let moveEventOneImage = function () {

            bindObject.unbind("mousemove");
            bindObject.bind("mousemove", function (event) {

                if (clicking) {

                    let limitX, limitY;
                    let imageOffsetX;
                    let imageOffsetY;
                    let offsetX;
                    let offsetY;

                    if (degree == 0 || degree == 180) {

                        let mx = oneImage.style.transformOrigin.split(" ")
                        let percentageX = parseInt(mx[0]) / oneImageDiv.getBoundingClientRect().width
                        let percentageY = parseInt(mx[1]) / oneImageDiv.getBoundingClientRect().height

                        limitX = (oneImage.getBoundingClientRect().width - oneImageDiv.clientWidth) / 2;
                        limitX = limitX.toFixed(0);

                        limitY = (oneImage.getBoundingClientRect().height - oneImageDiv.clientHeight) / 2;
                        limitY = limitY.toFixed(0);

                        let limitX_1 = (oneImage.getBoundingClientRect().width - oneImageDiv.clientWidth) * percentageX
                        let limitX_2 = (oneImage.getBoundingClientRect().width - oneImageDiv.clientWidth) * (1 - percentageX)

                        let limitY_1 = (oneImage.getBoundingClientRect().height - oneImageDiv.clientHeight) * percentageY
                        let limitY_2 = (oneImage.getBoundingClientRect().height - oneImageDiv.clientHeight) * (1 - percentageY)

                        console.log(limitX_1)
                        console.log(limitX_2)
                        console.log(limitY_1)
                        console.log(limitY_2)

                        offsetX = event.offsetX - startX;
                        offsetY = event.offsetY - startY;

                        imageOffsetX = offsetX + parseInt(oneImage.style.left);
                        imageOffsetY = offsetY + parseInt(oneImage.style.top);

                        oneImage.style.left = imageOffsetX + "px";
                        if (imageOffsetX >= limitX_1) {
                            /* 頂到左側停住 */
                            let borderS = limitX_1 + "px";
                            oneImage.style.left = borderS;
                        } else if (imageOffsetX <= (limitX_2 * -1)) {
                            /* 頂到右側停住 */
                            let borderS = (limitX_2 * -1) + "px";
                            oneImage.style.left = borderS;
                        } else {
                            /* 介於中間自由移動 */
                            oneImage.style.left = imageOffsetX + "px";
                        }

                        oneImage.style.top = imageOffsetY + "px";
                        if (imageOffsetY >= limitY_1) {
                            /* 頂到上側停住 */
                            let borderS = limitY_1 + "px";
                            oneImage.style.top = borderS;
                        } else if (imageOffsetY <= (limitY_2 * -1)) {
                            /* 頂到下側停住 */
                            let borderS = (limitY_2 * -1) + "px";
                            oneImage.style.top = borderS;
                        } else {
                            /* 介於中間自由移動 */
                            oneImage.style.top = imageOffsetY + "px";
                        }


                    } else if (degree == 90 || degree == 270) {

                        let rotateScale = oneImage.clientHeight / oneImage.clientWidth;

                        limitX = (oneImage.getBoundingClientRect().height - oneImageDiv.getBoundingClientRect().height) / 2;
                        limitX = limitX / rotateScale;
                        limitX = limitX.toFixed(0);

                        limitY = (oneImage.getBoundingClientRect().height - oneImageDiv.getBoundingClientRect().height) / 2;
                        limitY = limitY.toFixed(0);

                        offsetX = event.offsetX - startX;
                        offsetY = event.offsetY - startY;

                        imageOffsetX = offsetX + parseInt(oneImage.style.left);
                        imageOffsetY = offsetY + parseInt(oneImage.style.top);

                        if (imageOffsetX >= limitX) {
                            /* 頂到左側停住 */
                            let borderS = limitX + "px";
                            oneImage.style.left = borderS;
                        } else if (imageOffsetX <= (limitX * -1)) {
                            /* 頂到右側停住 */
                            let borderS = (limitX * -1) + "px";
                            oneImage.style.left = borderS;
                        } else {
                            /* 介於中間自由移動 */
                            oneImage.style.left = imageOffsetX + "px";
                        }

                        if (imageOffsetY >= limitY) {
                            /* 頂到上側停住 */
                            let borderS = limitY + "px";
                            oneImage.style.top = borderS;
                        } else if (imageOffsetY <= (limitY * -1)) {
                            /* 頂到下側停住 */
                            let borderS = (limitY * -1) + "px";
                            oneImage.style.top = borderS;
                        } else {
                            /* 介於中間自由移動 */
                            oneImage.style.top = imageOffsetY + "px";
                        }

                    }
                }


            });




        }

        let moveEventMulImage = function () {

            bindObject.unbind("mousemove");
            bindObject.bind("mousemove", function (event) {

                if (clicking) {

                    for (let i = 0; i < moveObject.length; i++) {

                        let limitX, limitY;
                        let imageOffsetX;
                        let imageOffsetY;
                        let offsetX;
                        let offsetY;
                        let maxWidthRange;
                        let maxHeightRange;
                        let minWidthRange;
                        let minHeightRange;

                        if (degree == 0 || degree == 180) {

                            maxWidthRange = moveObject[i].getBoundingClientRect().width;
                            minWidthRange = moveObject[i].parentNode.clientWidth;
                            limitX = (maxWidthRange - minWidthRange) / 2;
                            limitX = limitX.toFixed(0);

                            maxHeightRange = moveObject[i].getBoundingClientRect().height;
                            minHeightRange = moveObject[i].parentNode.clientHeight;
                            limitY = (maxHeightRange - minHeightRange) / 2;
                            limitY = limitY.toFixed(0);

                            offsetX = event.offsetX - startX;
                            offsetY = event.offsetY - startY;

                            imageOffsetX = offsetX + parseInt(moveObject[i].style.left);
                            imageOffsetY = offsetY + parseInt(moveObject[i].style.top);

                            if (imageOffsetX >= limitX) {
                                /* 頂到左側停住 */
                                let borderS = limitX + "px";
                                moveObject[i].style.left = borderS
                            } else if (imageOffsetX <= (limitX * -1)) {
                                /* 頂到右側停住 */
                                let borderS = (limitX * -1) + "px";
                                moveObject[i].style.left = borderS
                            } else {
                                /* 介於中間自由移動 */
                                moveObject[i].style.left = imageOffsetX + "px";
                            }

                            if (imageOffsetY >= limitY) {
                                /* 頂到上側停住 */
                                let borderS = limitY + "px";
                                moveObject[i].style.top = borderS
                            } else if (imageOffsetY <= (limitY * -1)) {
                                /* 頂到下側停住 */
                                let borderS = (limitY * -1) + "px";
                                moveObject[i].style.top = borderS
                            } else {
                                /* 介於中間自由移動 */
                                moveObject[i].style.top = imageOffsetY + "px";
                            }


                        } else if (degree == 90 || degree == 270) {

                            let rotateScale = moveObject[i].naturalWidth / moveObject[i].naturalHeight;

                            maxWidthRange = moveObject[i].getBoundingClientRect().height;
                            console.log(maxWidthRange)
                            minWidthRange = moveObject[i].parentNode.clientHeight;
                            console.log(minWidthRange)
                            limitX = (maxWidthRange - minWidthRange) / 2;
                            // limitX = limitX / rotateScale;
                            limitX = limitX.toFixed(0);

                            maxHeightRange = moveObject[i].getBoundingClientRect().height;
                            console.log(maxHeightRange)
                            minHeightRange = moveObject[i].parentNode.getBoundingClientRect().height;
                            console.log(minHeightRange)
                            limitY = (maxHeightRange - minHeightRange) / 2;
                            limitY = rotateScale * limitY;
                            limitY = limitY.toFixed(0);

                            offsetX = event.offsetX - startX;
                            offsetY = event.offsetY - startY;

                            imageOffsetX = offsetX + parseInt(moveObject[i].style.left);
                            imageOffsetY = offsetY + parseInt(moveObject[i].style.top);

                            if (imageOffsetX >= limitY) {
                                /* 頂到左側停住 */
                                let borderS = limitY + "px";
                                moveObject[i].style.left = borderS
                            } else if (imageOffsetX <= (limitY * -1)) {
                                /* 頂到右側停住 */
                                let borderS = (limitY * -1) + "px";
                                moveObject[i].style.left = borderS
                            } else {
                                /* 介於中間自由移動 */
                                moveObject[i].style.left = imageOffsetX + "px";
                            }

                            if (imageOffsetY >= limitX) {
                                /* 頂到上側停住 */
                                let borderS = limitX + "px";
                                moveObject[i].style.top = borderS
                            } else if (imageOffsetY <= (limitX * -1)) {
                                /* 頂到下側停住 */
                                let borderS = (limitX * -1) + "px";
                                moveObject[i].style.top = borderS
                            } else {
                                /* 介於中間自由移動 */
                                moveObject[i].style.top = imageOffsetY + "px";
                            }





                        }
                    }
                }
            });

        }

        if (moveParameter === 1) {
            moveEventOneImage();
        } else if (moveParameter === 2) {
            moveEventMulImage();
        }

        $(document).mouseup(function (event) {
            event.preventDefault();
            clicking = false;
            maxLimit = true;
        })


    }

    function oneImageLoad() {

        oneImage.onload = function () {

            if (oneImage.naturalWidth < oneImage.naturalHeight) {
                //9:16 or 3:4
                let tempWidth = document.body.clientWidth * 0.5;
                let scale = oneImage.naturalWidth / oneImage.naturalHeight;
                oneImageDiv.style.height = tempWidth * scale + 'px'
                oneImageDiv.style.width = tempWidth * scale * scale + 'px'
            } else {
                //16:9 or 4:3
                oneImageDiv.style.height = ''
                oneImageDiv.style.width = ''
            }

            //參數輸入1 移動單張大圖
            imageMouseMove(1);

        }

    }

    function getDirectoryEntry(path) {

        fileSystem.root.getDirectory(path, { create: true }, function (dirEntry) {

            readFiles(dirEntry);

        });

    }

    function readFiles(DirectoryEntry) {


        $("#thumbnail").empty();
        var reader = DirectoryEntry.createReader();

        var readEntries = function () {

            reader.readEntries(function (entries) {

                // readEntries 一次最多只會read 100個 entries 出來
                if (!entries.length) {

                    // 所有檔案loading結束
                    // 大圖設定成最後一張拍的圖片
                    selectOneImageId = thumbnail.firstChild.childNodes[1].id;
                    oneImage.src = thumbnail.firstChild.childNodes[1].src;

                    $(".thumbnailImg").css("opacity", '0.5');
                    thumbnail.firstChild.style.opacity = '1.0';

                    lastSelectOneImage = thumbnail.firstChild;


                    oneImageLoad();

                    //註冊縮圖點擊事件
                    thumbnailClick();



                } else if (entries.length) {
                    entries.forEach(function (element) {

                        if (element.isFile) {

                            let src = element.toURL();
                            let id = element.name.split(".")[0];
                            let imgEle = document.createElement("img");

                            let imgDiv = document.createElement("div");
                            let imgTitle = document.createElement("span");

                            imgEle.src = src
                            imgEle.id = id;

                            imgTitle.innerHTML = element.name

                            console.log(typeof (imgEle))

                            imgDiv.id = id;
                            imgDiv.className = "thumbnailImg"
                            imgDiv.appendChild(imgTitle)
                            imgDiv.appendChild(imgEle)


                            thumbnail.appendChild(imgDiv)

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
                    getDirectoryEntry('/' + paperId)

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