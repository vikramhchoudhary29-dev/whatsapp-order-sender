Option Explicit
Dim shell, args, command, i, exitCode
Set shell = CreateObject("WScript.Shell")
Set args = WScript.Arguments
If args.Count = 0 Then WScript.Quit 2
command = """" & shell.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\WindowsPowerShell\v1.0\powershell.exe"" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "
For i = 0 To args.Count - 1
  command = command & " """ & Replace(args(i), """", """""") & """"
Next
exitCode = shell.Run(command, 0, True)
WScript.Quit exitCode
