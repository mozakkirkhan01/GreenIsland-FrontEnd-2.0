import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-progress',
  standalone: true, // 🔥 THIS IS REQUIRED
  imports: [],       // (optional, but fine)
  templateUrl: './progress.html',
  styleUrls: ['./progress.css'], // ⚠️ also fix this (see below)
})
export class Progress implements OnInit {

  constructor() { }

  ngOnInit(): void {}
}