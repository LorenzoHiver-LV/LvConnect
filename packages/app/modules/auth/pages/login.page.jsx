// @flow

import * as React from 'react';
import { Field, reduxForm } from 'redux-form';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';

import type { FormProps } from 'redux-form';
import type { ConnectedLoginProps } from './login.connector';

// import { lvConnect } from '../lvconnect'
import TextField from '../../../components/inputs/textField.component';
import bgUrl from '../../../assets/images/login-bg.svg';
import logoUrl from '../../../assets/images/logo-lv.svg';

const styles = theme => ({
  loginPage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    height: `calc(100% + ${theme.spacing.unit * 6}px)`,
    boxSizing: 'border-box',
    background: `url(${bgUrl}) no-repeat`,
    backgroundSize: 'cover',
    margin: -theme.spacing.unit * 3,
  },
  loginButtonWrapper: {
    marginTop: theme.spacing.unit * 2,
  },
  logoLV: {
    marginBottom: theme.spacing.unit * 10,
  },
});

type LoginProps = ConnectedLoginProps & {
  ...FormProps,
  classes: any;
};

class Login extends React.Component<LoginProps> {
  componentDidMount() {
    // lvConnect.mountLoginButton(this.loginButtonContainer)
  }

  componentWillReceiveProps(props) {
    if (props.isConnected) {
      this.props.push('/');
    }
  }

  render() {
    const { classes, error, handleSubmit } = this.props;

    return (
      <form className={classes.loginPage} onSubmit={handleSubmit}>
        <img src={logoUrl} alt="Logo LinkValue" className={classes.logoLV} />
        <Card>
          <CardContent>
            <Typography variant="headline" component="h2" gutterBottom>
              Connexion
            </Typography>
            <Field component={TextField} name="email" label="Email" type="email" fullWidth />
            <Field component={TextField} name="password" label="Mot de passe" type="password" fullWidth />
            {error ? <Typography color="error">{'Une erreur s\'est produite lors de la connexion'}</Typography> : null}
          </CardContent>
          <CardActions>
            <Button type="submit" color="primary">Se connecter</Button>
            <Button>Mot de passe oublié</Button>
          </CardActions>
        </Card>
      </form>
    );
  }
}

export default reduxForm({
  form: 'loginForm',
  validate: () => ({}),
  onSubmit: () => Promise.resolve(),
})(withStyles(styles)(Login));