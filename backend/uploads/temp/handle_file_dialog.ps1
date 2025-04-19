
          Add-Type -AssemblyName System.Windows.Forms
          
          function Find-FileDialog {
              $dialogs = @(Get-Process | Where-Object { 
                  $_.MainWindowTitle -match 'Open' -or 
                  $_.MainWindowTitle -match 'Открыть' -or
                  $_.MainWindowTitle -match 'Файл' -or
                  $_.MainWindowTitle -match 'File'
              })
              return $dialogs
          }
          
          # Ждем диалог выбора файла до 10 секунд
          $startTime = Get-Date
          $dialogs = Find-FileDialog
          
          while ($dialogs.Count -eq 0 -and ((Get-Date) - $startTime).TotalSeconds -lt 10) {
              Start-Sleep -Milliseconds 500
              $dialogs = Find-FileDialog
              Write-Host "Поиск диалогов: $($dialogs.Count) найдено"
          }
          
          if ($dialogs.Count -gt 0) {
              Write-Host "Найден диалог выбора файла"
              
              # Активируем диалог с помощью Win32 API
              Add-Type @"
              using System;
              using System.Runtime.InteropServices;
              
              public class Win32 {
                  [DllImport("user32.dll")]
                  [return: MarshalAs(UnmanagedType.Bool)]
                  public static extern bool SetForegroundWindow(IntPtr hWnd);
                  
                  [DllImport("user32.dll")]
                  public static extern IntPtr FindWindowEx(IntPtr hwndParent, IntPtr hwndChildAfter, string lpszClass, string lpszWindow);
                  
                  [DllImport("user32.dll")]
                  public static extern bool SetWindowText(IntPtr hWnd, string text);
              }
"@
              
              foreach ($dialog in $dialogs) {
                  try {
                      # Устанавливаем фокус на диалог
                      [Win32]::SetForegroundWindow($dialog.MainWindowHandle)
                      Start-Sleep -Seconds 1
                      
                      # Вводим путь к файлу и нажимаем Enter
                      [System.Windows.Forms.SendKeys]::SendWait("C:\Users\Богдан\Documents\GitHub\FarmFBv2\backend\uploads\temp\da514a01-81b8-4874-97da-62b65eb87086.jpeg")
                      Start-Sleep -Milliseconds 500
                      [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
                      
                      Write-Host "Введен путь к файлу и нажат Enter: C:\Users\Богдан\Documents\GitHub\FarmFBv2\backend\uploads\temp\da514a01-81b8-4874-97da-62b65eb87086.jpeg"
                      break
                  }
                  catch {
                      Write-Host "Ошибка при взаимодействии с диалогом: $_"
                  }
              }
          }
          else {
              Write-Host "Диалог выбора файла не найден"
          }
          