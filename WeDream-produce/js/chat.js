function chat(message) {
  return api.post("/api/chat", {
    message,
  });
}

function removeNewlines(str) {
  return str.split(`\n`).join("<br>");
}

async function getImageText() {
  const loadingContainer = document.querySelector(".loading-container");
  try {
    const input = document.querySelector(".input-container .input-field");
    const imageTextContainer = document.querySelector(".image-text-container");

    loadingContainer.classList.add("show");

    const message = input.value;

    const res = await chat(message);

    // console.log("========>", res);
    let { status, message: json } = res.data;
    if (status != 200) {
      alert("操作失败");
      // 在用户点击确定后刷新页面
      window.location.reload();
      return;
    }

    json = removeNewlines(json);
    // console.log(json);
    // console.log(typeof json);

    // console.log(JSON.parse(json));

    json = JSON.parse(json);

    imageTextContainer.querySelector("img").src = json.img;
    imageTextContainer.querySelector("p").innerHTML = json.content;

    imageTextContainer.classList.add("show");
    loadingContainer.classList.remove("show");
  } catch (err) {
    loadingContainer.classList.remove("show");
    console.log(err);
    alert("操作失败,请输入正确的梦境");
    // 在用户点击确定后刷新页面
    window.location.reload();
  }
}
