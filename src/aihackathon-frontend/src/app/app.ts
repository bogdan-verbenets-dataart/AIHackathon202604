import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface WeatherForecast {
  date: string;
  temperatureC: number;
  temperatureF: number;
  summary: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  title = 'AI Hackathon 2026';
  forecasts: WeatherForecast[] = [];
  loading = false;
  error = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadForecasts();
  }

  loadForecasts(): void {
    this.loading = true;
    this.error = '';
    this.http.get<WeatherForecast[]>('/api/weatherforecast').subscribe({
      next: (data) => {
        this.forecasts = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load forecasts: ' + err.message;
        this.loading = false;
      }
    });
  }
}
