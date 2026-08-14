// 禁用右键菜单
document.addEventListener('contextmenu', function (event) {
    event.preventDefault();
});




// ===============================网页主体==========================

(function ($) {
    $.fn.timeline = function () {
        var selectors = {
            id: $(this),
            item: $(this).find(".item"),
            activeClass: "item--active",
            img: ".img"
        };
        // 将第一个时间轴项目激活，并设置时间轴背景图片为第一个项目的图片
        selectors.item.eq(0).addClass(selectors.activeClass);
        selectors.id.css(
            "background-image",
            "url(" +
            selectors.item.first()
                .find(selectors.img)
                .attr("src") +
            ")"
        );
        // 获取时间轴项目的总数
        var itemLength = selectors.item.length;
        // 当页面滚动时，触发滚动事件
        $(window).scroll(function () {
            var max, min;
            // 获取页面滚动的距离
            var pos = $(this).scrollTop();
            selectors.item.each(function (i) {
                // 获取当前时间轴项目的最小和最大高度
                min = $(this).offset().top;  //min：元素距离文档顶部的距离
                max = $(this).height() + $(this).offset().top; //max：元素距离文档顶部的距离 + 元素的高度

                var that = $(this);
                // 如果滚动到最后一个项目，并且超过了当前项目高度的一半，
                // 则将最后一个项目设置为激活状态，并设置背景图片为最后一个项目的图片
                if (i == itemLength - 2 && pos > min + $(this).height() / 2) {
                    selectors.item.removeClass(selectors.activeClass);
                    selectors.id.css(
                        "background-image",
                        "url(" +
                        selectors.item.last()
                            .find(selectors.img)
                            .attr("src") +
                        ")"
                    );
                    selectors.item.last().addClass(selectors.activeClass);
                }
                // 如果当前滚动位置在当前项目的最小和最大高度之间，
                // 则将当前项目设置为激活状态，并设置背景图片为当前项目的图片
                else if (pos <= max && pos >= min - 220) {
                    selectors.id.css(
                        "background-image",
                        "url(" +
                        $(this)
                            .find(selectors.img)
                            .attr("src") +
                        ")"
                    );
                    selectors.item.removeClass(selectors.activeClass);
                    $(this).addClass(selectors.activeClass);
                }
            });
        });
    };
})(jQuery)
/*
最后，我们调用 timeline 插件并传入时间轴的 ID 作为参数。
这将启用时间轴插件并为该时间轴绑定滚动事件。
*/
$("#shell").timeline();






//================================================================【日志功能】==================================================
const changelogButton = document.getElementById('changelog-button'); //日志功能点击按钮
const changelogModal = document.getElementById('changelog-modal'); //

changelogButton.addEventListener('click', toggleChangelogModal);

function toggleChangelogModal() {
    changelogModal.style.display = 'block';
    changelogModal.classList.toggle('fade-in');
    changelogModal.classList.toggle('fade-out');
}

var isFirstClick = true;
document.addEventListener('click', function (event) {
    //第一次弹窗默认弹窗，点击哪里都能关闭弹窗
    if (isFirstClick == true) {
        //移除弹窗的渐入动画、增加淡出动画
        changelogModal.classList.remove('fade-in');
        changelogModal.classList.add('fade-out');
        //淡出动画的CSS持续时间为0.5s，因此这0.5s内，弹窗的display="none"需要延迟0.5s执行
        setTimeout(function () {
            changelogModal.style.display = 'none';
        }, 500 // 0.5秒延时，和CSS代码中的 fade-out 持续时间一致
        );
        isFirstClick = false;
    }
    //第二次点击弹窗之后，只能点击弹窗外的地方才能关闭
    else if (!changelogModal.contains(event.target) && !changelogButton.contains(event.target)) {
        //逻辑同上
        changelogModal.classList.remove('fade-in');
        changelogModal.classList.add('fade-out');
        setTimeout(function () {
            changelogModal.style.display = 'none';
        }, 500);
    }
});



//更新日志设置（模板字符串）
const logTitle = document.getElementById("logtitle");
const logText = document.getElementById("logtext");
const title = "6.27 V3.0网站更新日志";
const content = `
<br>
1.【多莉】还有【芭芭拉】的主题页面登场！全球计数器同步上线！~<br>
2.【纳西妲】新增中文语音 “呐呐”，欢迎体验<br>
3. 优化了其它逻辑<br>
`;

logTitle.innerHTML = `<h2>${title}</h2>`;
logText.innerHTML = `<p>${content}</p>`;
