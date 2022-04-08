const FileRepository = require('./FileRepository');
const UserService = require('../users/UserService');
const {
  updateUserCover,
  updateUserAvatar,
} = require('../social/SocialService');

class FileService {
  constructor() {
    this.fileRepository = new FileRepository();
    this.userService = new UserService();
  }

  uploadUserAvatar = async (userId, file) => {
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

    //TODO: observale pattern
    await updateUserAvatar(userId, {
      avatar: fileResp.Location,
    });

    if (!fileResp.Location) throw new Error('Upload avatar failed!');

    return fileData;
  };

  uploadUserCover = async (userId, file) => {
    const schema = 'sso';
    const fileResp = await this.fileRepository.uploadAvatarCover(file, schema);
    const fileData = {
      url: fileResp.Location,
    };

    await this.userService.update(userId, {
      cover: fileResp.Location,
    });

    //TODO: observale pattern
    await updateUserCover(userId, {
      cover: fileResp.Location,
    });

    if (!fileResp.Location) throw new Error('Upload cover failed!');

    return fileData;
  };
}

module.exports = FileService;
