const FileRepository = require('./FileRepository');
const UserService = require('../users/UserService');

class FileService {
  constructor() {
    this.fileRepository = new FileRepository();
    this.userService = new UserService();
  }

  uploadUserAvatar = async (file, userId) => {
    // TODO: implement getschemafrom request header to know which service
    // send the request
    const schema = 'sso';
    const fileResp = await this.fileRepository.uploadAvatarImage(file, schema);
    const fileData = {
      url: fileResp.Location,
    };

    await this.userService.update(userId, {
      avatar: fileResp.Location,
    });

    if (!fileResp.Location) throw new Error('Upload avatar failed!');

    return fileData;
  };
}

module.exports = FileService;
