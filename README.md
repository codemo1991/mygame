# 太阳系轨道探险 | Solar System Game

基于手绘太阳系轨道图的互动网页游戏，使用 Next.js 构建。

## 功能

- **太阳系可视化**：太阳、八大行星（水星→海王星）、小行星带
- **手绘风格**：轨道与行星采用涂鸦式渲染，贴近原图风格
- **轨道动画**：行星按不同速度绕太阳公转
- **自由探索**：点击任意行星查看名称
- **行星测验**：根据提示找出指定行星，答对得分

## 运行方式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 即可游玩。

## 构建生产版本

```bash
npm run build
npm start
```

## 项目结构

```
mygame/
├── prototype/           # 手绘原型图
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   └── components/
│       └── SolarSystemGame.tsx  # 主游戏组件
├── package.json
└── README.md
```
