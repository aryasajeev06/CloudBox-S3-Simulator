// Get HTML elements
const fileInput = document.getElementById("fileInput");
const fileTableBody = document.getElementById("fileTableBody");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");

const totalFiles = document.getElementById("totalFiles");
const totalSize = document.getElementById("totalSize");
const fileCount = document.getElementById("fileCount");
const emptyMessage = document.getElementById("emptyMessage");

const storagePercent = document.getElementById("storagePercent");
const progressBar = document.getElementById("progressBar");
const storageText = document.getElementById("storageText");
const fileTypeStats = document.getElementById("fileTypeStats");


// Store uploaded files
let files = [];


// When files are selected
fileInput.addEventListener("change", async function () {

    const selectedFiles = Array.from(fileInput.files);

    if (selectedFiles.length === 0) {
        return;
    }

    for (const file of selectedFiles) {

        try {

            // Create form data
            const formData = new FormData();

            formData.append("file", file);


            // Send file to Node.js backend
            const response = await fetch(
                "/upload",
                {
                    method: "POST",
                    body: formData
                }
            );


            const result = await response.json();


            if (!response.ok) {
                throw new Error(result.message || "Upload failed");
            }


            // Add file to frontend list
            files.push({
                file: file,
                name: file.name,
                size: file.size,
                type: getFileType(file)
            });


            console.log(result.message);

        } catch (error) {

            console.error(error);

            alert(
                "Upload failed for " +
                file.name +
                "\n\n" +
                error.message
            );
        }
    }


    // Update webpage
    displayFiles();

    


    // Clear file input
    fileInput.value = "";
});


// Display files
function displayFiles() {

    fileTableBody.innerHTML = "";

    const searchText = searchInput.value.toLowerCase();
    const filter = filterSelect.value;

    let visibleFiles = files.filter(function (item) {

        const matchesSearch =
            item.name.toLowerCase().includes(searchText);

        const matchesFilter =
            filter === "all" || item.type === filter;

        return matchesSearch && matchesFilter;
    });


    visibleFiles.forEach(function (item) {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${item.name}</td>

            <td>${getFileIcon(item.type)} ${item.type}</td>

            <td>${formatFileSize(item.size)}</td>

            <td>${new Date().toLocaleDateString()}</td>

            <td>
                <button class="download-btn">
                    Download
                </button>

                <button class="delete-btn">
                    Delete
                </button>
            </td>
        `;


        // Download button
        row.querySelector(".download-btn").addEventListener(
            "click",
            function () {
                downloadFile(item);
            }
        );


        // Delete button
        row.querySelector(".delete-btn").addEventListener(
            "click",
            function () {
                deleteFile(item);
            }
        );


        fileTableBody.appendChild(row);

    });


    updateStatistics();
    updateEmptyMessage(visibleFiles.length);
}


// Determine file type
function getFileType(file) {

    const type = file.type.toLowerCase();

    if (type.startsWith("image/")) {
        return "image";
    }

    if (
        type.includes("pdf") ||
        type.includes("word") ||
        type.includes("text") ||
        type.includes("document")
    ) {
        return "document";
    }

    if (type.startsWith("video/")) {
        return "video";
    }

    return "other";
}


// File icons
function getFileIcon(type) {

    if (type === "image") {
        return "📷";
    }

    if (type === "document") {
        return "📄";
    }

    if (type === "video") {
        return "🎬";
    }

    return "📦";
}


// Format file size
function formatFileSize(bytes) {

    if (bytes < 1024) {
        return bytes + " Bytes";
    }

    if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


// Delete file
async function deleteFile(item) {

    const confirmDelete = confirm(
        "Are you sure you want to delete " +
        item.name +
        "?"
    );

    if (!confirmDelete) {
        return;
    }


    try {

        const response = await fetch(
            "/files/" +
            encodeURIComponent(item.name),
            {
                method: "DELETE"
            }
        );


        const result = await response.json();


        if (!response.ok) {
            throw new Error(
                result.message || "Delete failed"
            );
        }


        // Remove from frontend list
        files = files.filter(function (file) {
            return file !== item;
        });


        displayFiles();


        alert("File deleted successfully.");

    } catch (error) {

        console.error(error);

        alert(
            "Could not delete the file.\n\n" +
            error.message
        );
    }
}


// Download file
async function downloadFile(item) {

    try {

        const url =
            "/download/" +
            encodeURIComponent(item.name);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Download failed");
        }

        const blob = await response.blob();

        const downloadUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = downloadUrl;
        link.download = item.name;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(downloadUrl);

    } catch (error) {

        console.error(error);

        alert("Could not download the file.");
    }
}


// Search files
searchInput.addEventListener("input", function () {
    displayFiles();
});


// Filter files
filterSelect.addEventListener("change", function () {
    displayFiles();
});


// Update statistics
function updateStatistics() {

    const numberOfFiles = files.length;

    const totalBytes = files.reduce(function (sum, item) {
        return sum + item.size;
    }, 0);


    totalFiles.textContent = numberOfFiles;

    totalSize.textContent = formatFileSize(totalBytes);

    fileCount.textContent =
        numberOfFiles + (numberOfFiles === 1 ? " file" : " files");


    // Storage limit = 10 MB
    const storageLimit = 10 * 1024 * 1024;

    const percentage =
        (totalBytes / storageLimit) * 100;

    const safePercentage =
        Math.min(percentage, 100);


    storagePercent.textContent =
        safePercentage.toFixed(1) + "%";

    progressBar.style.width =
        safePercentage + "%";

    storageText.textContent =
        formatFileSize(totalBytes) + " / 10 MB";


    updateFileTypeStats();
}


// Update file type statistics
function updateFileTypeStats() {

    let images = 0;
    let documents = 0;
    let videos = 0;
    let other = 0;


    files.forEach(function (item) {

        if (item.type === "image") {
            images++;
        }
        else if (item.type === "document") {
            documents++;
        }
        else if (item.type === "video") {
            videos++;
        }
        else {
            other++;
        }

    });


    fileTypeStats.innerHTML = `
        <p>📷 Images: ${images}</p>
        <p>📄 Documents: ${documents}</p>
        <p>🎬 Videos: ${videos}</p>
        <p>📦 Other: ${other}</p>
    `;
}


// Show or hide empty message
function updateEmptyMessage(numberOfVisibleFiles) {

    if (numberOfVisibleFiles === 0) {
        emptyMessage.style.display = "block";
    }
    else {
        emptyMessage.style.display = "none";
    }
}


// Initial display
displayFiles();

// Load files from AWS S3
async function loadS3Files() {

    try {

        const response = await fetch(
            "/files"
        );

        if (!response.ok) {
            throw new Error("Could not load files from S3");
        }

        const s3Files = await response.json();

        // Add S3 files to the webpage
        s3Files.forEach(function (item) {

            // Avoid duplicates
            const alreadyExists = files.some(function (file) {
                return file.name === item.name;
            });

            if (!alreadyExists) {

                files.push({
                    file: null,
                    name: item.name,
                    size: item.size,
                    type: getFileTypeFromName(item.name),
                    lastModified: item.lastModified
                });

            }

        });

        displayFiles();

    } catch (error) {

        console.error("S3 loading error:", error);

    }
}

async function checkCloudConnection() {

    const status =
        document.getElementById("connectionStatus");

    try {

        const response =
            await fetch("/files");

        if (!response.ok) {
            throw new Error("Backend unavailable");
        }

        status.textContent = "Connected";
        status.style.color = "#28a745";

    } catch (error) {

        console.error(error);

        status.textContent = "Offline";
        status.style.color = "#dc3545";
    }
}


// Determine file type using filename
function getFileTypeFromName(fileName) {

    const extension =
        fileName.split(".").pop().toLowerCase();


    if (
        ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)
    ) {
        return "image";
    }


    if (
        ["pdf", "doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx"].includes(extension)
    ) {
        return "document";
    }


    if (
        ["mp4", "avi", "mov", "mkv", "webm"].includes(extension)
    ) {
        return "video";
    }


    return "other";
}


// Load S3 files when page opens
loadS3Files();

checkCloudConnection();