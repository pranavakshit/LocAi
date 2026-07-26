[Setup]
AppName=LocAi
AppVersion=1.0.0
DefaultDirName={userpf}\LocAi
DefaultGroupName=LocAi
UninstallDisplayIcon={app}\LocAi.exe
Compression=lzma2
SolidCompression=yes
OutputDir=Output
OutputBaseFilename=LocAi-installer
PrivilegesRequired=lowest

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked
Name: "cleaninstall"; Description: "Clean Installation (Wipe all previous data in userdata/)"; GroupDescription: "Installation Mode:"; Flags: unchecked

[Files]
Source: "dist\LocAi\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\LocAi"; Filename: "{app}\LocAi.exe"
Name: "{commondesktop}\LocAi"; Filename: "{app}\LocAi.exe"; Tasks: desktopicon

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  UserDataDir: string;
begin
  if CurStep = ssInstall then
  begin
    if WizardIsTaskSelected('cleaninstall') then
    begin
      UserDataDir := ExpandConstant('{userprofile}\LocAi\userdata');
      if DirExists(UserDataDir) then
      begin
        DelTree(UserDataDir, True, True, True);
      end;
    end;
  end;
end;
