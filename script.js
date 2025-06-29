(function () {
    // 插件常量
    const extensionName = "Worldbook Manager";
    const extensionId = "worldbook-manager";
    const iconId = `${extensionId}-icon`;
    const modalId = `${extensionId}-modal`;

    // 全局变量，用于存储插件状态
    let modalElement = null;

    /**
     * 加载CSS样式文件
     */
    async function loadCSS() {
        const cssPath = `extensions/${extensionName}/style.css`;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = cssPath;
        document.head.appendChild(link);
    }

    /**
     * 创建并显示浮动图标
     */
    function createDraggableIcon() {
        if (document.getElementById(iconId)) return; // 防止重复创建

        const icon = document.createElement("div");
        icon.id = iconId;
        icon.innerHTML = "🍧";
        document.body.appendChild(icon);

        // 点击事件：打开管理窗口
        icon.addEventListener("click", (event) => {
            // 简单的点击/拖动区分
            if (icon.isDragging) {
                icon.isDragging = false; // 重置拖动标记
                return;
            }
            showWorldbookManager();
        });

        // 拖动逻辑
        let isDragging = false;
        let offsetX, offsetY;

        icon.addEventListener("mousedown", (e) => {
            isDragging = true;
            icon.isDragging = false; // 重置拖动标记
            offsetX = e.clientX - icon.getBoundingClientRect().left;
            offsetY = e.clientY - icon.getBoundingClientRect().top;
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            icon.isDragging = true; // 标记为正在拖动
            
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            // 限制在窗口内
            const maxX = window.innerWidth - icon.offsetWidth;
            const maxY = window.innerHeight - icon.offsetHeight;

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            icon.style.left = `${newX}px`;
            icon.style.top = `${newY}px`;
            // 移除 bottom 和 right 样式，以 left 和 top 为准
            icon.style.bottom = 'auto';
            icon.style.right = 'auto';
        }

        function onMouseUp() {
            isDragging = false;
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        }
    }

    /**
     * 显示世界书管理窗口
     */
    async function showWorldbookManager() {
        // 如果窗口不存在，则创建它
        if (!modalElement) {
            const htmlContent = await SillyTavern.getPluginFileContent("index.html");
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            modalElement = tempDiv.firstChild;
            document.body.appendChild(modalElement);

            // 绑定关闭事件
            modalElement.querySelector(".close-button").addEventListener("click", hideWorldbookManager);
            modalElement.querySelector("#wb-manager-close").addEventListener("click", hideWorldbookManager);
            
            // 绑定禁用选中事件
            modalElement.querySelector("#wb-manager-disable-selected").addEventListener("click", () => updateEntries(false));
        }

        populateEntryList();
        modalElement.style.display = "block";
    }

    /**
     * 隐藏世界书管理窗口
     */
    function hideWorldbookManager() {
        if (modalElement) {
            modalElement.style.display = "none";
        }
    }

    /**
     * 填充条目列表到窗口中
     */
    function populateEntryList() {
        // SillyTavern的全局变量 world_info 存储了所有世界书信息
        const { entries } = SillyTavern.getContext().world_info;
        const listContainer = modalElement.querySelector("#worldbook-entry-list");
        listContainer.innerHTML = ''; // 清空旧列表

        const enabledEntries = entries.filter(entry => entry.enabled);

        if (enabledEntries.length === 0) {
            listContainer.innerHTML = '<p>当前没有已启用的世界书条目。</p>';
            return;
        }

        enabledEntries.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'worldbook-entry-item';
            
            // 使用 entry.uid 作为唯一标识符，如果没有 uid，则使用 key
            const entryId = entry.uid || entry.key;

            item.innerHTML = `
                <input type="checkbox" data-entry-id="${entryId}">
                <label>${entry.key}</label>
            `;
            listContainer.appendChild(item);
        });
    }

    /**
     * 更新选定条目的状态
     * @param {boolean} newStatus - true 为启用, false 为禁用
     */
    async function updateEntries(newStatus) {
        const context = SillyTavern.getContext();
        const { entries } = context.world_info;
        const checkboxes = modalElement.querySelectorAll('#worldbook-entry-list input[type="checkbox"]:checked');
        
        if (checkboxes.length === 0) {
            SillyTavern.showToast("请先选择至少一个条目！", "warning");
            return;
        }

        const selectedEntryIds = Array.from(checkboxes).map(cb => cb.dataset.entryId);
        let updatedCount = 0;

        selectedEntryIds.forEach(id => {
            // 找到匹配的条目并更新其状态
            const entry = entries.find(e => (e.uid || e.key) === id);
            if (entry && entry.enabled !== newStatus) {
                entry.enabled = newStatus;
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            // 非常重要：调用SillyTavern的函数来保存更改
            await SillyTavern.world_info.save();
            SillyTavern.showToast(`成功${newStatus ? '启用' : '禁用'}了 ${updatedCount} 个条目。`, "success");
        } else {
             SillyTavern.showToast("没有条目状态被改变。", "info");
        }

        hideWorldbookManager();
    }


    /**
     * 插件的主入口函数
     */
    function onSillyTavernReady() {
        // 加载CSS
        loadCSS();
        // 创建图标
        createDraggableIcon();
        console.log(`${extensionName} loaded.`);
    }

    // 等待SillyTavern完全加载后再执行插件
    if (SillyTavern.isReady) {
        onSillyTavernReady();
    } else {
        document.addEventListener('SillyTavernReady', onSillyTavernReady, { once: true });
    }

})();