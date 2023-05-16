let currentPageFiles=1;
const filesPerPage=5;
let currentPageUsers=1;
const usersPerPage=10;

async function loadFiles(){
  const e=await fetch("/uploads");
  return (await e.json()).map((e=>decodeURIComponent(e)));
}

async function loadUsers(){
  const e=await loadFiles();
  const t=await fetch("/users_with_files"),
        n=await t.json(),
        a=document.getElementById("userList");
  a.innerHTML="";
  const s=(currentPageUsers-1)*usersPerPage,
        i=s+usersPerPage;
  n.slice(s,i).forEach((t=>{
    const n=document.createElement("li");
    n.classList.add("list-group-item","user-item");
    n.innerHTML=`
    <div class="user-info">
      <span>${t.company_name}</span>
      <span class="file-name${t.file_name?" bound":""}" data-user-id="${t.id}">${t.file_name||""}</span>
      ${t.file_name?'<i class="bi bi-check-lg tick-icon"></i>':""}
    </div>
      <button class="delete-btn" data-user-id="${t.id}">Delete User</button>
      <select class="file-select" data-user-id="${t.id}">
        <option value="">Select file</option>
        ${e.map((e=>`<option value="${e}">${e}</option>`)).join("")}
      </select>
      <button class="bind-btn" data-user-id="${t.id}">Bind</button>
      <button class="unbind-btn" data-user-id="${t.id}">Unbind</button>
    `;
    a.appendChild(n);
    n.querySelector(".bind-btn").addEventListener("click",(async()=>{
      const e=t.id,
            a=document.querySelector(`.file-select[data-user-id="${e}"]`).value;
      if(!a){
        return void console.log("Please select a file to bind");
      }
      const s=await fetch("/bind",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:e,fileName:a})}),
            i=await s.text();
      if(s.status === 200){
        displayBoundFile(n,e,a);
        loadUsers();
      }
    }));
    n.querySelector(".unbind-btn").addEventListener("click",(async()=>{
      const e=t.id,
            a=await fetch("/unbind",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:e})}),
            s=await a.text();
      alert(s);
      loadUsers();
    }));
    n.querySelector(".delete-btn").addEventListener("click",(async()=>{
      const e=t.id;
      if(confirm("Are you sure you want to delete this user?")){
        const t=await fetch(`/delete_user/${e}`,{method:"DELETE"}),
              n=await t.text();
        alert(n);
        loadUsers();
      } else {
        console.log("User deletion canceled.")
      }
    }));
  }));
  createPagination(a,n.length,usersPerPage,currentPageUsers,"users");
  updateFileList(); 
}

async function updateFileList(){
  const files = await loadFiles(),
        fileList = document.getElementById("fileList");
  fileList.innerHTML = "";
  const startIndex = (currentPageFiles-1) * filesPerPage,
        endIndex = startIndex + filesPerPage;
  files.slice(startIndex, endIndex).forEach((fileName)=>{
    const fileItem = document.createElement("li");
    fileItem.classList.add("list-group-item");
    fileItem.textContent = fileName;
    const deleteButton = document.createElement("button");
    deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
    deleteButton.classList.add("btn","btn-danger","btn-sm","float-end","ms-2");
    deleteButton.addEventListener("click", async (event)=>{
      event.preventDefault();
      event.stopPropagation();
      if(confirm("Are you sure you want to delete this file?")){
        const response = await fetch(`/delete/${fileName}`, {method: "DELETE"}),
              message = await response.text();
        alert(message);
        updateFileList();
        loadUsers();
      } else {
        console.log("File deletion canceled.");
      }
    });
    fileItem.appendChild(deleteButton);
    fileList.appendChild(fileItem);
  });
  createPagination(fileList, files.length, filesPerPage, currentPageFiles, "files");
}

function unDisplayBoundFile(userId){
  const userItem = document.querySelector(`.user-item[data-user-id="${userId}"]`);
  if(userItem){
    const fileNameElement = userItem.querySelector(`.file-name`);
    if(fileNameElement){
      fileNameElement.textContent = "";
      fileNameElement.classList.remove("bound");
    }
    const tickIcon = userItem.querySelector(".tick-icon");
    if(tickIcon){
      tickIcon.remove();
    }
  }
}

function displayBoundFile(e,t,n){
  e.querySelector(`.file-name[data-user-id="${t}"]`).textContent=n;
}

function createPagination(e,t,n,a,s){
  const i=Math.ceil(t/n),
        l=document.createElement("nav");
  l.setAttribute("aria-label","Page navigation");
  const o=document.createElement("ul");
  o.className="pagination justify-content-center";
  for(let e=1;e<=i;e++){
    const t=document.createElement("li");
    t.className="page-item"+(a===e?" active":"");
    const n=document.createElement("a");
    n.className="page-link";
    n.textContent=e;
    n.addEventListener("click",(()=>{
      if(s==="files"){
        currentPageFiles=e;
        updateFileList();
      } else if(s==="users"){
        currentPageUsers=e;
        loadUsers();
      }
    }));
    t.appendChild(n);
    o.appendChild(t);
  }
  l.appendChild(o);
  e.appendChild(l);
}

document.addEventListener("DOMContentLoaded", (e) => {
  let registerForm = document.getElementById("register-form");
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = registerForm.querySelector('input[name="email"]').value;
    const n = registerForm.querySelector('input[name="password"]').value;
    const a = registerForm.querySelector('input[name="company_name"]').value;
    
    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: t, password: n, company_name: a })
      });
      
      if (response.status === 200) {
        registerForm.reset();
        loadUsers();
      }
      
      const text = await response.text();
      alert(text);
    } catch (error) {
      console.error(error);
    }
  });
});

document.getElementById("logoutButton")?.addEventListener("click",(function(){
  fetch("/logoff", {method: "POST", headers: {"Content-Type": "application/json"}})
  .then((e=>{
    e.ok?window.location.href="/login.html":console.error("Logout failed")
  }))
  .catch((e=>console.error("Error:",e)))
}));

loadUsers();
