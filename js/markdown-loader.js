// Markdown 文章加载器
document.addEventListener('DOMContentLoaded', function() {
  const articleContainer = document.getElementById('article-container');
  
  // 获取当前页面 URL 参数
  const urlParams = new URLSearchParams(window.location.search);
  const articleFile = urlParams.get('article');

  if (articleFile) {
    fetch(`articles/${articleFile}.md`)
      .then(response => response.text())
      .then(text => {
        // 使用 marked.js 解析 Markdown
        articleContainer.innerHTML = marked.parse(text);
      })
      .catch(error => {
        articleContainer.innerHTML = `<p>无法加载文章：${error.message}</p>`;
      });
  } else {
    articleContainer.innerHTML = '<p>请选择一篇文章</p>';
  }
});
