/**
 * Local-only circulation UI preview.
 * This module intentionally does not create or change database records.
 */
import { $, $all, setFeedback, showToast } from "./ui.js";

const students = [
  { id: "ST-2025-0142", name: "Sarah Namusoke", className: "S3 East" },
  { id: "ST-2025-0188", name: "Sarah Namutebi", className: "S3 West" },
  { id: "ST-2025-0091", name: "David Mugisha", className: "S4 North" },
  { id: "ST-2024-0028", name: "Agnes Nakato", className: "S4 East" },
  { id: "ST-2025-0217", name: "Peter Kato", className: "S2 West" }
];

const books = [
  { id: "LIB-000451", title: "Things Fall Apart", category: "Literature", shelf: "LIT-R01-S02", available: true },
  { id: "LIB-000217", title: "Biology for Secondary Schools", category: "Biology", shelf: "SCI-R02-S03", available: false },
  { id: "LIB-000332", title: "A Grain of Wheat", category: "Literature", shelf: "LIT-R01-S03", available: true },
  { id: "LIB-000109", title: "New General Mathematics", category: "Mathematics", shelf: "MAT-R01-S01", available: true },
  { id: "LIB-000452", title: "Things Fall Apart", category: "Literature", shelf: "LIT-R01-S02", available: true }
];

let mode = "borrow";
let selectedStudent = null;
let selectedBook = null;

export function initCirculationDemo() {
  $all("[data-circulation-mode]").forEach(button => {
    button.addEventListener("click", () => setMode(button.dataset.circulationMode));
  });
  $("#student-search")?.addEventListener("input", renderStudentResults);
  $("#book-search")?.addEventListener("input", renderBookResults);
  $("#circulation-form")?.addEventListener("submit", handleSubmit);
  $("#circulation-reset")?.addEventListener("click", resetForm);
  setDefaultDueDate();
}

function setMode(nextMode) {
  mode = nextMode === "return" ? "return" : "borrow";
  $all("[data-circulation-mode]").forEach(button => {
    const active = button.dataset.circulationMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  $("#circulation-step-title").textContent = mode === "borrow" ? "Find the student" : "Find the borrower";
  $("#circulation-step-description").textContent = mode === "borrow"
    ? "Search by student name or admission number."
    : "Search the student who borrowed the book.";
  $("#book-step-title").textContent = mode === "borrow" ? "Select a book copy" : "Select the returned copy";
  $("#book-step-description").textContent = mode === "borrow"
    ? "Only available copies can be borrowed."
    : "Choose the book copy being returned.";
  $("#book-search").placeholder = mode === "borrow" ? "Search title or copy ID" : "Search borrowed title or copy ID";
  $("#due-date-wrap").hidden = mode === "return";
  $("#circulation-submit").textContent = mode === "borrow" ? "Preview borrowing" : "Preview return";
  $("#student-search").value = "";
  $("#book-search").value = "";
  clearSelections();
  setFeedback($("#circulation-feedback"), "");
}

function renderStudentResults() {
  const query = $("#student-search").value.trim().toLowerCase();
  const results = $("#student-search-results");
  results.replaceChildren();
  if (query.length < 1) {
    results.hidden = true;
    return;
  }
  const matches = students.filter(student =>
    `${student.name} ${student.id} ${student.className}`.toLowerCase().includes(query)
  ).slice(0, 6);

  if (!matches.length) {
    results.append(makeEmptyResult("No matching student found."));
  } else {
    matches.forEach(student => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      button.innerHTML = `<span class="search-result-main"><strong></strong><small></small></span><span class="search-result-arrow" aria-hidden="true">→</span>`;
      button.querySelector("strong").textContent = student.name;
      button.querySelector("small").textContent = `${student.id} · ${student.className}`;
      button.addEventListener("click", () => selectStudent(student));
      results.append(button);
    });
  }
  results.hidden = false;
}

function renderBookResults() {
  const query = $("#book-search").value.trim().toLowerCase();
  const results = $("#book-search-results");
  results.replaceChildren();
  if (query.length < 1) {
    results.hidden = true;
    return;
  }

  const matches = books.filter(book => {
    const matchesText = `${book.title} ${book.id} ${book.category} ${book.shelf}`.toLowerCase().includes(query);
    return matchesText && (mode === "return" ? !book.available : book.available);
  }).slice(0, 8);

  if (!matches.length) {
    results.append(makeEmptyResult(mode === "borrow" ? "No available matching copies found." : "No matching borrowed copy found in this demo."));
  } else {
    matches.forEach(book => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      button.innerHTML = `<span class="search-result-main"><strong></strong><small></small></span><span class="search-result-arrow" aria-hidden="true">→</span>`;
      button.querySelector("strong").textContent = book.title;
      button.querySelector("small").textContent = `${book.id} · ${book.category} · ${book.shelf}`;
      button.addEventListener("click", () => selectBook(book));
      results.append(button);
    });
  }
  results.hidden = false;
}

function makeEmptyResult(message) {
  const item = document.createElement("div");
  item.className = "search-result";
  item.textContent = message;
  item.style.color = "#8c98a6";
  item.style.fontSize = "11px";
  return item;
}

function selectStudent(student) {
  selectedStudent = student;
  $("#student-search-results").hidden = true;
  $("#student-search").value = student.name;
  const selected = $("#selected-student");
  selected.replaceChildren();
  const info = document.createElement("div");
  const strong = document.createElement("strong");
  strong.textContent = student.name;
  const small = document.createElement("small");
  small.textContent = `${student.id} · ${student.className}`;
  info.append(strong, small);
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-selection";
  remove.textContent = "Change";
  remove.addEventListener("click", () => {
    selectedStudent = null;
    selected.hidden = true;
    $("#student-search").focus();
  });
  selected.replaceChildren(info, remove);
  selected.hidden = false;
}

function selectBook(book) {
  selectedBook = book;
  $("#book-search-results").hidden = true;
  $("#book-search").value = book.title;
  const selected = $("#selected-book");
  selected.replaceChildren();
  const info = document.createElement("div");
  const strong = document.createElement("strong");
  strong.textContent = book.title;
  const small = document.createElement("small");
  small.textContent = `${book.id} · ${book.category} · Shelf ${book.shelf}`;
  info.append(strong, small);
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-selection";
  remove.textContent = "Change";
  remove.addEventListener("click", () => {
    selectedBook = null;
    selected.hidden = true;
    $("#book-search").focus();
  });
  selected.replaceChildren(info, remove);
  selected.hidden = false;
}

function handleSubmit(event) {
  event.preventDefault();
  const feedback = $("#circulation-feedback");
  if (!selectedStudent) {
    setFeedback(feedback, "Select a student from the search results first.", "error");
    $("#student-search").focus();
    return;
  }
  if (!selectedBook) {
    setFeedback(feedback, "Select a book copy from the search results first.", "error");
    $("#book-search").focus();
    return;
  }
  if (mode === "borrow" && !selectedBook.available) {
    setFeedback(feedback, "That copy is not available to borrow.", "error");
    return;
  }
  if (mode === "borrow") {
    const dueDate = $("#due-date").value;
    if (!dueDate) {
      setFeedback(feedback, "Choose a due date before continuing.", "error");
      $("#due-date").focus();
      return;
    }
    setFeedback(
      feedback,
      `Demo preview only: ${selectedStudent.name} would borrow ${selectedBook.title} (${selectedBook.id}), due ${dueDate}. No record has been saved.`,
      "info"
    );
  } else {
    setFeedback(
      feedback,
      `Demo preview only: ${selectedBook.title} (${selectedBook.id}) would be marked returned for ${selectedStudent.name}. No record has been saved.`,
      "info"
    );
  }
  showToast("Preview only — no database transaction was made.");
}

function setDefaultDueDate() {
  const due = $("#due-date");
  if (!due) return;
  const date = new Date();
  date.setDate(date.getDate() + 3);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  due.value = localDate.toISOString().slice(0, 10);
}

function clearSelections() {
  selectedStudent = null;
  selectedBook = null;
  $("#selected-student").hidden = true;
  $("#selected-book").hidden = true;
  $("#student-search-results").hidden = true;
  $("#book-search-results").hidden = true;
}

function resetForm() {
  $("#student-search").value = "";
  $("#book-search").value = "";
  clearSelections();
  setFeedback($("#circulation-feedback"), "");
  setDefaultDueDate();
}
