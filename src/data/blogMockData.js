export const archivePosts = [
    {
        type: "随笔",
        title: "从 NAS 开始的个人网站计划",
        date: "2026-07-26",
        readTime: "6 min",
        mood: "施工中",
        excerpt: "把公网 IPv6、端口放行、静态站部署和域名解析串起来之后，个人网站终于从想法变成了一个可以慢慢生长的地方（先别上强度）。",
        tags: ["建站", "NAS", "IPv6"]
    },
    {
        type: "文章",
        title: "为什么先做静态内容而不是后端",
        date: "2026-07-25",
        readTime: "8 min",
        mood: "架构笔记",
        excerpt: "前端展示优先，数据源后置。等内容结构稳定之后，再把文章、图片和攻略数据迁移到轻量后端（别急，锅会自己长出来）。",
        tags: ["Vue", "设计", "架构"]
    },
    {
        type: "随笔",
        title: "收藏夹也是一种生活痕迹",
        date: "2026-07-21",
        readTime: "4 min",
        mood: "小记",
        excerpt: "从番剧、游戏攻略到奇怪网页玩具，收藏本身就能拼出一个人的兴趣地图（可能还有一点点精神状态）。",
        tags: ["收藏", "兴趣", "个人主页"]
    }
]

export const yuriWorks = [
    {
        name: "终将成为你",
        byline: "安静、克制、非常适合放在书架第一层",
        cover: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80",
        kind: "动画 / 漫画",
        score: "S",
        note: "情绪推进很细，适合写长评（这块以后可以拆文章详情）。",
        tags: ["校园", "成长", "细腻"],
        links: [
            { label: "资料页", url: "https://zh.wikipedia.org/wiki/%E7%B5%82%E5%B0%87%E6%88%90%E7%82%BA%E4%BD%A0" }
        ]
    },
    {
        name: "安达与岛村",
        byline: "像午后便利店冰柜旁边的低温气泡水",
        cover: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=900&q=80",
        kind: "轻小说 / 动画",
        score: "A+",
        note: "适合作为“慢热关系”专题入口（要慢慢看）。",
        tags: ["轻小说", "慢热", "日常"],
        links: [
            { label: "资料页", url: "https://zh.wikipedia.org/wiki/%E5%AE%89%E9%81%94%E8%88%87%E5%B3%B6%E6%9D%91" }
        ]
    },
    {
        name: "莉可丽丝",
        byline: "枪、咖啡、都市传说，以及非常会营业的二人组",
        cover: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
        kind: "原创动画",
        score: "A",
        note: "可以做成同人作品索引（图文资源需要之后接文件服务）。",
        tags: ["原创", "动作", "同人"],
        links: [
            { label: "资料页", url: "https://zh.wikipedia.org/wiki/Lycoris_Recoil" }
        ]
    },
    {
        name: "孤独摇滚！",
        byline: "严格来说不算纯百合，但二创生态很热闹",
        cover: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
        kind: "动画 / 音乐",
        score: "A",
        note: "可以作为“同人推荐”试验田（先展示链接，不做站内搬运）。",
        tags: ["音乐", "二创", "轻喜剧"],
        links: [
            { label: "资料页", url: "https://zh.wikipedia.org/wiki/%E5%AD%A4%E7%8D%A8%E6%90%96%E6%BB%BE%EF%BC%81" }
        ]
    }
]

export const gameGuides = [
    {
        game: "崩坏：星穹铁道",
        title: "末日幻影 / 虚构叙事 高难作业入口",
        date: "更新追踪",
        status: "高时效",
        source: "Bilibili",
        url: "https://www.bilibili.com",
        summary: "按版本、深渊轮次和角色池整理视频入口，后续适合接一个爬取或手动录入后台（先 mock 看布局）。",
        tags: ["星铁", "配队", "深渊"]
    },
    {
        game: "绝区零",
        title: "危局强袭战 / 零号空洞 速查板",
        date: "待补充",
        status: "施工",
        source: "Bilibili",
        url: "https://www.bilibili.com",
        summary: "把角色练度、操作门槛和视频来源拆成统一字段，方便后面做筛选。",
        tags: ["绝区零", "动作", "攻略"]
    },
    {
        game: "综合",
        title: "版本活动奖励与限时任务提醒",
        date: "未来模块",
        status: "待接后端",
        source: "手动维护",
        url: "#",
        summary: "这里以后可以从简易后台发布短讯，也可以先用 JSON 文件打包发布。",
        tags: ["活动", "提醒", "入口"]
    }
]

export const funProjects = [
    {
        name: "黑塔转圈圈",
        badge: "已确定搬运入口",
        description: "点一下转一圈，精神状态非常稳定（大概）。",
        demo: "https://www.mxin.moe/scripts/heita/index.html",
        repo: "https://github.com/duiqt/herta_kuru",
        accent: "#f6c453"
    },
    {
        name: "像素天气小窗",
        badge: "概念占位",
        description: "把天气变成一块可以发呆的小屏幕（以后可接 API）。",
        demo: "#",
        repo: "#",
        accent: "#77c8ff"
    },
    {
        name: "随机番剧签",
        badge: "概念占位",
        description: "点一下抽今天适合看的作品（可能会抽到存货压力）。",
        demo: "#",
        repo: "#",
        accent: "#ff8fb3"
    }
]

export const aboutHighlights = [
    { label: "前端主力", value: "Vue 3", detail: "Element / Vite / 静态站部署" },
    { label: "服务器", value: "NAS", detail: "J3455 + 16G，适合轻量服务" },
    { label: "内容方向", value: "ACGN", detail: "文章、百合动漫、游戏攻略、Web 玩具" }
]
