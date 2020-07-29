document.addEventListener('DOMContentLoaded', () => {
    const targetUrl = `./JavaScript/model.js?p=${(new Date()).getTime()}`;
    const scriptElement = document.createElement('script');
    scriptElement.src = targetUrl;
    document.head.appendChild(scriptElement);
});